import { AzureDevOpsService, getOrganizationName } from "./AzureDevOpsService";
import SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, getClient } from "azure-devops-extension-api";
import { GraphUser } from "azure-devops-extension-api/Graph";
import { Wiql, WorkItemTrackingRestClient, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";

export class CurrentProjectTaskService {
    private azureService = new AzureDevOpsService();

    /**
     * Gets the name of the current project.
     */
    public async getProjectName(): Promise<string> {
        const projectService = await SDK.getService<any>(CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();

        if (!project || !project.name) {
            throw new Error("Project not found");
        }
        console.log(`getProjectName() Project name: ${project.name}`);
        return project.name;
    }

    /**
     * Gets all tasks assigned to all users in the current project.
     */
    public async getTasksForUsers(): Promise<any[]> {
        const projectName = await this.getProjectName();
        const users = await this.getAllUsersInProject();

        if (!users.length) {
            console.log("No users found.");
            return [];
        }

        const assignedToUsers = users.map((user: GraphUser) => `'${user.principalName}'`).join(",");
        // console.log(`getTasksForUsers() Assigned users: ${assignedToUsers}`);

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
                      AND [System.AssignedTo] IN (${assignedToUsers})
                `
        };

        const workItemClient = await getClient(WorkItemTrackingRestClient);
        const result = await workItemClient.queryByWiql(wiql);

        if (!result.workItems || result.workItems.length === 0) {
            console.log("No tasks found.");
            return [];
        }

        const ids = result.workItems.map((wi) => wi.id!);
        const workItems = await workItemClient.getWorkItems(ids, undefined, undefined, undefined, WorkItemExpand.Fields);

        workItems.forEach((task) => {
            const taskDetails = {
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
            };
            // console.log(
            //     taskDetails.Id,
            //     taskDetails.Project,
            //     taskDetails.Title,
            //     taskDetails.WorkItemType,
            //     taskDetails.AssignedTo,
            //     taskDetails.State,
            //     taskDetails.StoryPoints,
            //     taskDetails.OriginalEstimate,
            //     taskDetails.RemainingWork,
            //     taskDetails.CompletedWork,
            //     taskDetails.CreatedDate,
            //     taskDetails.ChangedDate
            // );
        });

        return workItems;
    }

    /**
     * Gets all users in the current project.
     */
    private async getAllUsersInProject(): Promise<GraphUser[]> {
        const organization = await getOrganizationName();
        const token = await this.azureService.getToken();
        const url = `https://vssps.dev.azure.com/${organization}/_apis/graph/users?api-version=7.1-preview.1`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`getAllUsersInProject() Fetched ${data.count} users for project: ${organization}`);
            return data.value;
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    }
}
