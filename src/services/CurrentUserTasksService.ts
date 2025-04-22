import { getClient } from "azure-devops-extension-api";
import { Wiql, WorkItemTrackingRestClient, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import SDK from "azure-devops-extension-sdk";
import { AllProjectTasksService } from "./AllProjectTasksService";
import { CurrentProjectTaskService } from "./CurrentProjectTaskService";

// CurrentUserTasksService: Handles current user task queries
export class CurrentUserTasksService {
    private allProjectTasksService = new AllProjectTasksService();
    private currentProjectTaskService = new CurrentProjectTaskService();

    /**
     * Gets the current user using Azure DevOps Extension SDK (client-side, no REST call).
     */
    public async getCurrentUser(): Promise<any> {
        await SDK.ready();
        const user = SDK.getUser();
        // Use user.name (email) for WIQL queries
        if (!user || !user.name) {
            console.error("Current user not found or missing name (email).");
            return null;
        }
        return user;
    }

    /**
     * Gets all tasks assigned to the current user in the current project.
     */
    public async getAllTaskForUser(): Promise<any[]> {
        const currentUser = await this.getCurrentUser();
        const userEmail = currentUser?.name;
        if (!currentUser || !userEmail) {
            console.error("Current user not found or missing name (email).");
            return [];
        }
        const projectName = await this.currentProjectTaskService.getProjectName();
        const wiql: Wiql = {
            query: `
                    SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo],
                           [Microsoft.VSTS.Scheduling.StoryPoints],
                           [Microsoft.VSTS.Scheduling.OriginalEstimate],
                           [Microsoft.VSTS.Scheduling.RemainingWork],
                           [Microsoft.VSTS.Scheduling.CompletedWork],
                           [System.CreatedDate],
                           [Microsoft.VSTS.Common.ClosedDate],
                           [System.ChangedDate]
                    FROM WorkItems
                    WHERE [System.TeamProject] = '${projectName}'
                      AND [System.AssignedTo] = '${userEmail}'
                `
        };
        const workItemClient = await getClient(WorkItemTrackingRestClient);
        const result = await workItemClient.queryByWiql(wiql);
        if (!result.workItems || result.workItems.length === 0) {
            return [];
        }
        const ids = result.workItems.map((wi) => wi.id!);
        const workItems = await workItemClient.getWorkItems(ids, undefined, undefined, undefined, WorkItemExpand.Fields);
        console.log("getAllTaskForUser() result:", workItems);
        return workItems.map((task) => ({
            Project: projectName,
            Id: task.id,
            Title: task.fields["System.Title"],
            WorkItemType: task.fields["System.WorkItemType"] ?? "Unknown",
            AssignedTo: task.fields["System.AssignedTo"]?.displayName || "Unassigned",
            State: task.fields["System.State"],
            StoryPoints: task.fields["Microsoft.VSTS.Scheduling.StoryPoints"] ?? "Not set",
            Effort: task.fields["Microsoft.VSTS.Scheduling.Effort"] ?? "Not set",
            OriginalEstimate: task.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] ?? 0,
            RemainingWork: task.fields["Microsoft.VSTS.Scheduling.RemainingWork"] ?? 0,
            CompletedWork: task.fields["Microsoft.VSTS.Scheduling.CompletedWork"] ?? 0,
            CreatedDate: task.fields["System.CreatedDate"] ?? "Unknown",
            ChangedDate: task.fields["System.ChangedDate"] ?? "Unknown"
        }));
    }

    /**
     * Gets all tasks assigned to the current user across all projects.
     */
    public async getAllTasksForCurrentUserAcrossProjects(): Promise<any[]> {
        const currentUser = await this.getCurrentUser();
        const userEmail = currentUser?.name;
        if (!currentUser || !userEmail) {
            console.error("Current user not found or missing name (email).");
            return [];
        }
        const projectNames = await this.allProjectTasksService.getAllProjectNames();
        const allTasks: any[] = [];
        for (const projectName of projectNames) {
            const wiql: Wiql = {
                query: `
                        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo],
                               [Microsoft.VSTS.Scheduling.StoryPoints],
                               [Microsoft.VSTS.Scheduling.OriginalEstimate],
                               [Microsoft.VSTS.Scheduling.RemainingWork],
                               [Microsoft.VSTS.Scheduling.CompletedWork],
                               [System.CreatedDate],
                               [Microsoft.VSTS.Common.ClosedDate],
                               [System.ChangedDate]
                        FROM WorkItems
                        WHERE [System.TeamProject] = '${projectName}'
                          AND [System.AssignedTo] = '${userEmail}'
                    `
            };
            try {
                const workItemClient = await getClient(WorkItemTrackingRestClient);
                const result = await workItemClient.queryByWiql(wiql);
                if (!result.workItems || result.workItems.length === 0) {
                    continue;
                }
                const ids = result.workItems.map((wi) => wi.id!);
                const workItems = await workItemClient.getWorkItems(ids, undefined, undefined, undefined, WorkItemExpand.Fields);
                console.log(`getAllTasksForCurrentUserAcrossProjects() for project ${projectName}:`, workItems);
                allTasks.push(
                    ...workItems.map((task) => ({
                        Project: projectName,
                        Id: task.id,
                        Title: task.fields["System.Title"],
                        WorkItemType: task.fields["System.WorkItemType"] ?? "Unknown",
                        AssignedTo: task.fields["System.AssignedTo"]?.displayName || "Unassigned",
                        State: task.fields["System.State"],
                        StoryPoints: task.fields["Microsoft.VSTS.Scheduling.StoryPoints"] ?? "Not set",
                        Effort: task.fields["Microsoft.VSTS.Scheduling.Effort"] ?? "Not set",
                        OriginalEstimate: task.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] ?? 0,
                        RemainingWork: task.fields["Microsoft.VSTS.Scheduling.RemainingWork"] ?? 0,
                        CompletedWork: task.fields["Microsoft.VSTS.Scheduling.CompletedWork"] ?? 0,
                        CreatedDate: task.fields["System.CreatedDate"] ?? "Unknown",
                        ChangedDate: task.fields["System.ChangedDate"] ?? "Unknown"
                    }))
                );
            } catch (error) {
                console.error(`Error fetching tasks for user in project '${projectName}':`, error);
            }
        }
        return allTasks;
    }
}
