import { getClient, CommonServiceIds } from "azure-devops-extension-api";
import { GraphUser } from "azure-devops-extension-api/Graph";
import { WorkItemTrackingRestClient, Wiql, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import SDK from "azure-devops-extension-sdk";

export class AzureDevOpsService {
    private static readonly organization = "AntonKozak"; // Replace with your Azure DevOps organization name
    private static readonly token = "1sCmEWoNZtRZe7OX6PqAW7qJeLkeaWF9E6bH6hQkzoJtUZlO53bdJQQJ99BDACAAAAAAAAAAAAASAZDO2vdt"; // Hardcoded PAT

    //#region Get All Tasks in the Project
    public async getProjectName(): Promise<string> {
        const projectService = await SDK.getService<any>(CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();

        if (!project || !project.name) {
            throw new Error("Project not found");
        }
        console.log(`getProjectName() Project name: ${project.name}`);
        return project.name;
    }

    private async getAllUsersInProject(): Promise<GraphUser[]> {
        const url = `https://vssps.dev.azure.com/${AzureDevOpsService.organization}/_apis/graph/users?api-version=7.1-preview.1`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${AzureDevOpsService.token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`getAllUsersInProject() Fetched ${data.count} users for project: ${AzureDevOpsService.organization}`);
            return data.value;
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    }

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
    //#endregion

    //#region Get All Tasks from All Projects
    public async getAllProjectNames() {
        const url = `https://dev.azure.com/${AzureDevOpsService.organization}/_apis/projects?api-version=7.1-preview.1`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${AzureDevOpsService.token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch projects: ${response.statusText}`);
            }

            const data = await response.json();

            const dataDetails = {
                count: data.count,
                value: data.value.map((project: any) => ({
                    name: project.name,
                    description: project.description,
                    state: project.state,
                    visibility: project.visibility
                }))
            };

            return data.value.map((project: any) => project.name);
        } catch (error) {
            console.error("Error fetching projects:", error);
            return [];
        }
    }

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

            workItems.forEach((task) => {
                const DetailedTask = {
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
                //     DetailedTask.Id,
                //     DetailedTask.Project,
                //     DetailedTask.Title,
                //     DetailedTask.WorkItemType,
                //     DetailedTask.AssignedTo,
                //     DetailedTask.State,
                //     DetailedTask.StoryPoints,
                //     DetailedTask.OriginalEstimate,
                //     DetailedTask.RemainingWork,
                //     DetailedTask.CompletedWork,
                //     DetailedTask.CreatedDate,
                //     DetailedTask.ChangedDate
                // );
            });

            return workItems;
        } catch (error) {
            console.error(`Error fetching tasks for project '${projectName}':`, error);
            return [];
        }
    }

    //#endregion
    //#region Iteration/Sprint

    getTeamName = async (projectName: string): Promise<string> => {
        const url = `https://dev.azure.com/${AzureDevOpsService.organization}/_apis/projects/${projectName}/teams?api-version=7.1-preview.1`;
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${AzureDevOpsService.token}`,
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
    };

    public async getTeamIterations(projectName: string, teamName: string): Promise<any[]> {
        const url = `https://dev.azure.com/${AzureDevOpsService.organization}/${projectName}/${teamName}/_apis/work/teamsettings/iterations?api-version=7.1-preview.1`;

        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${AzureDevOpsService.token}`,
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

const azureService = new AzureDevOpsService();

azureService
    .getTasksForUsers()
    .then((tasks) => {
        console.log("Tasks for users in current project:", tasks);
    })
    .catch((error) => {
        console.error("Error fetching user tasks:", error);
    });

azureService
    .getAllProjectNames()
    .then(async (projectNames) => {
        console.log("All Projects:", projectNames);

        const taskPromises = projectNames.map((project: any) => azureService.getAllTasksFromProject(project));
        const allTasks = (await Promise.all(taskPromises)).flat();

        console.log("All Tasks from All Projects:", allTasks);
    })
    .catch((error) => {
        console.error("Error fetching all tasks from projects:", error);
    });

azureService.getProjectName().then(async (projectName) => {
    const getTeamName = await azureService.getTeamName(projectName);
    const teamName = getTeamName;
    const sprintTasks = await azureService.getTasksGroupedBySprint(projectName, teamName);

    console.log("All tasks grouped by sprint:");
    console.log(sprintTasks);
});
