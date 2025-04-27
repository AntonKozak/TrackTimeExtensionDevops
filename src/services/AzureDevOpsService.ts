import { getClient, CommonServiceIds } from "azure-devops-extension-api";
import { GraphUser } from "azure-devops-extension-api/Graph/Graph";
import { Wiql, WorkItemTrackingRestClient, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import SDK from "azure-devops-extension-sdk";

export async function getOrganizationName(): Promise<string> {
    await SDK.ready();
    const config = SDK.getConfiguration();
    let url = "";
    if (config && config.baseUri) {
        url = config.baseUri;
    } else {
        url = window.location.origin;
    }
    const parts = url.split("/");
    let org = parts[parts.length - 1] || parts[parts.length - 2];
    if (org === "localhost:8888") {
        org = "AntonKozak";
    }
    console.log("[getOrganizationName] baseUri:", url, "organization:", org);
    return org;
}

export class AzureDevOpsService {
    async getToken() {
        await SDK.ready();
        const token = await SDK.getAccessToken();
        console.log("[AzureDevOpsService] token:", token);
        return token;
    }

    //#region  Current User and Project

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
        const projectName = await this.getProjectName();
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
        const projectNames = await this.getAllProjectNames();
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

    /**
     * Gets the state graph for a given work item type in the current project and logs it to the console.
     * @param workItemType The work item type (e.g., 'Task', 'Bug').
     */
    public async logStateGraphForWorkItemType(workItemType: string): Promise<void> {
        const projectName = await this.getProjectName();
        const workItemClient = await getClient(WorkItemTrackingRestClient);
        try {
            // Get the state graph for the specified work item type in the current project
            const stateGraph = await workItemClient.getWorkItemTypeStates(projectName, workItemType);
            console.log(`State Graph for '${workItemType}' in project '${projectName}':`, stateGraph);
        } catch (error) {
            console.error(`Failed to fetch state graph for work item type '${workItemType}' in project '${projectName}':`, error);
        }
    }

    /**
     * Gets the state graph for a given work item type in the current project and returns it.
     * @param workItemType The work item type (e.g., 'Task', 'Bug').
     */
    public async getStateGraphForWorkItemType(workItemType: string): Promise<any | null> {
        const projectName = await this.getProjectName();
        const workItemClient = await getClient(WorkItemTrackingRestClient);
        try {
            const stateGraph = await workItemClient.getWorkItemTypeStates(projectName, workItemType);
            return stateGraph;
        } catch (error) {
            console.error(`Failed to fetch state graph for work item type '${workItemType}' in project '${projectName}':`, error);
            return null;
        }
    }

    /**
     * Gets the entry and exit timestamps for the 'Active' state for a work item, and the duration spent in 'Active'.
     * @param workItemId The ID of the work item.
     * @returns An object with enteredActive (Date), exitedActive (Date), and durationMs (number) or null if not found.
     */
    public async getActiveStateDuration(workItemId: number): Promise<{
        enteredActive: Date;
        exitedActive: Date;
        durationMs: number;
    } | null> {
        const workItemClient = await getClient(WorkItemTrackingRestClient);
        try {
            const revisions = await workItemClient.getRevisions(workItemId, undefined, undefined, WorkItemExpand.Fields);
            let enteredActive: Date | null = null;
            let exitedActive: Date | null = null;
            let lastState: string | null = null;
            for (const rev of revisions) {
                const state = rev.fields["System.State"];
                const changedDate = new Date(rev.fields["System.ChangedDate"]);
                if (state === "Active" && lastState !== "Active") {
                    enteredActive = changedDate;
                }
                if (state !== "Active" && lastState === "Active" && enteredActive) {
                    exitedActive = changedDate;
                    break;
                }
                lastState = state;
            }
            if (enteredActive && exitedActive) {
                return {
                    enteredActive,
                    exitedActive,
                    durationMs: exitedActive.getTime() - enteredActive.getTime()
                };
            }
            return null;
        } catch (error) {
            console.error(`Failed to fetch revisions for work item ${workItemId}:`, error);
            return null;
        }
    }

    /**
     * Gets all state transitions for a work item, with timestamps, who changed it, and duration in each state.
     * @param workItemId The ID of the work item.
     * @returns Array of state transitions: { fromState, toState, changedBy, changedDate, durationMs }
     */
    public async getAllStateTransitions(workItemId: number): Promise<
        Array<{
            fromState: string | null;
            toState: string;
            changedBy: string;
            changedDate: Date;
            durationMs: number | null;
        }>
    > {
        const workItemClient = await getClient(WorkItemTrackingRestClient);
        try {
            const revisions = await workItemClient.getRevisions(workItemId, undefined, undefined, WorkItemExpand.Fields);
            const transitions: Array<{
                fromState: string | null;
                toState: string;
                changedBy: string;
                changedDate: Date;
                durationMs: number | null;
            }> = [];
            let lastState: string | null = null;
            let lastChangedDate: Date | null = null;
            for (const rev of revisions) {
                const state = rev.fields["System.State"];
                const changedDate = new Date(rev.fields["System.ChangedDate"]);
                const changedBy = rev.fields["System.ChangedBy"]?.displayName || rev.fields["System.ChangedBy"] || "Unknown";
                if (lastState !== null && state !== lastState) {
                    transitions.push({
                        fromState: lastState,
                        toState: state,
                        changedBy,
                        changedDate,
                        durationMs: lastChangedDate ? changedDate.getTime() - lastChangedDate.getTime() : null
                    });
                    lastChangedDate = changedDate;
                } else if (lastState === null) {
                    // First revision
                    lastChangedDate = changedDate;
                }
                lastState = state;
            }
            return transitions;
        } catch (error) {
            console.error(`Failed to fetch state transitions for work item ${workItemId}:`, error);
            return [];
        }
    }

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
     * Returns an array of WorkItem objects as expected by the UI.
     */
    public async getTasksForUsers(): Promise<any[]> {
        const projectName = await this.getProjectName();
        const users = await this.getAllUsersInProject();
        if (!users.length) {
            console.log("No users found.");
            return [];
        }
        const assignedToUsers = users.map((user: GraphUser) => `'${user.principalName}'`).join(",");
        const wiql: Wiql = {
            query: `
                    SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], 
                           [Microsoft.VSTS.Scheduling.StoryPoints],
                           [Microsoft.VSTS.Scheduling.OriginalEstimate],
                           [Microsoft.VSTS.Scheduling.RemainingWork],
                           [Microsoft.VSTS.Scheduling.CompletedWork],
                           [System.CreatedDate],
                           [Microsoft.VSTS.Common.ClosedDate],
                           [System.ChangedDate],
                           [System.IterationPath],
                           [System.WorkItemType]
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
        // Map to WorkItem[] structure expected by the UI
        return workItems.map((task) => ({
            id: task.id,
            title: task.fields["System.Title"] ?? "Untitled",
            type: task.fields["System.WorkItemType"] ?? "Unknown",
            state: task.fields["System.State"] ?? "Unknown",
            assignedTo: task.fields["System.AssignedTo"]?.displayName || "Unassigned",
            originalEstimate: task.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] ?? 0,
            completedWork: task.fields["Microsoft.VSTS.Scheduling.CompletedWork"] ?? 0,
            taskDoneTime: task.fields["Microsoft.VSTS.Common.ClosedDate"] ?? null,
            sprint: task.fields["System.IterationPath"] ?? "",
            project: projectName
        }));
    }

    /**
     * Gets all users in the current project.
     */
    private async getAllUsersInProject(): Promise<GraphUser[]> {
        const organization = await getOrganizationName();
        const token = await this.getToken();
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
    //#region

    //#region All Project

    /**
     * Gets all project names in the organization.
     */
    public async getAllProjectNames() {
        const organization = await getOrganizationName();
        const token = await this.getToken();
        const url = `https://dev.azure.com/${organization}/_apis/projects?api-version=7.1-preview.1`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch projects: ${response.statusText}`);
            }

            const data = await response.json();

            return data.value.map((project: any) => project.name);
        } catch (error) {
            console.error("Error fetching projects:", error);
            return [];
        }
    }

    /**
     * Gets all tasks from a specific project.
     */
    public async getAllTasksFromProject(projectName: string): Promise<any[]> {
        try {
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
                    `
            };

            const workItemClient = await getClient(WorkItemTrackingRestClient);
            const result = await workItemClient.queryByWiql(wiql);

            if (!result.workItems || result.workItems.length === 0) {
                return [];
            }

            const ids = result.workItems.map((wi) => wi.id!);
            const workItems = await workItemClient.getWorkItems(ids, undefined, undefined, undefined, WorkItemExpand.Fields);

            return workItems;
        } catch (error) {
            console.error(`Error fetching tasks for project '${projectName}':`, error);
            return [];
        }
    }

    /**
     * Gets the name of the first team in a project.
     */
    public async getTeamName(projectName: string): Promise<string> {
        const organization = await getOrganizationName();
        const token = await this.getToken();
        const url = `https://dev.azure.com/${organization}/_apis/projects/${projectName}/teams?api-version=7.1-preview.1`;
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch teams: ${response.statusText}`);
            }

            const data = await response.json();
            const teams = data.value;
            console.log(`getTeamName() Fetched ${teams.length} teams for project: ${projectName}`);

            return teams[0]?.name || "No team found";
        } catch (error) {
            console.error("Error fetching teams:", error);
            return "No team found";
        }
    }

    /**
     * Gets all iterations for a team in a project.
     */
    public async getTeamIterations(projectName: string, teamName: string): Promise<any[]> {
        const organization = await getOrganizationName();
        const token = await this.getToken();
        const url = `https://dev.azure.com/${organization}/${projectName}/${teamName}/_apis/work/teamsettings/iterations?api-version=7.1-preview.1`;

        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch iterations: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Fetched ${data.count} iterations for team '${teamName}' in project '${projectName}'`);
            return data.value;
        } catch (error) {
            console.error("Error fetching team iterations:", error);
            return [];
        }
    }

    /**
     * Gets all tasks for a specific iteration in a project/team.
     */
    public async getTasksForIteration(projectName: string, teamName: string, iterationPath: string): Promise<any[]> {
        const wiql: Wiql = {
            query: `
                SELECT [System.Id], [System.Title], [System.State], [System.IterationPath]
                FROM WorkItems
                WHERE [System.TeamProject] = '${projectName}'
                  AND [System.IterationPath] = '${iterationPath}'
            `
        };

        const workItemClient = await getClient(WorkItemTrackingRestClient);
        const result = await workItemClient.queryByWiql(wiql);

        if (!result.workItems || result.workItems.length === 0) {
            console.log(`No work items found for iteration: ${iterationPath}`);
            return [];
        }

        const ids = result.workItems.map((wi) => wi.id!);
        const workItems = await workItemClient.getWorkItems(ids, undefined, undefined, undefined, WorkItemExpand.Fields);

        return workItems.map((task) => ({
            Id: task.id,
            Title: task.fields["System.Title"],
            State: task.fields["System.State"],
            IterationPath: task.fields["System.IterationPath"]
        }));
    }

    /**
     * Gets all tasks grouped by sprint for a project/team.
     */
    public async getTasksGroupedBySprint(projectName: string, teamName: string): Promise<any> {
        const iterations = await this.getTeamIterations(projectName, teamName);
        const result: Record<string, any[]> = {};

        for (const iteration of iterations) {
            const iterationPath = iteration.path;
            const tasks = await this.getTasksForIteration(projectName, teamName, iterationPath);
            result[iteration.name] = tasks;
        }

        return result;
    }
    //#endregion
}
