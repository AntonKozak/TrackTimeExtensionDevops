import { getClient, CommonServiceIds } from "azure-devops-extension-api";
import { GraphUser } from "azure-devops-extension-api/Graph";
import { WorkItemTrackingRestClient, Wiql, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import SDK from "azure-devops-extension-sdk";

export class AzureDevOpsService {
    private static readonly organization = "AntonKozak"; // Replace with your Azure DevOps organization name
    private static readonly token = "1sCmEWoNZtRZe7OX6PqAW7qJeLkeaWF9E6bH6hQkzoJtUZlO53bdJQQJ99BDACAAAAAAAAAAAAASAZDO2vdt"; // Hardcoded PAT

    //#region Get All Tasks in the Project
    private async getProjectName(): Promise<string> {
        const projectService = await SDK.getService<any>(CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();

        if (!project || !project.name) {
            throw new Error("Project not found");
        }

        console.log(`getProjectName() Project name: ${project.name}`);
        return project.name;
    }

    private async getAllUsersInProject(): Promise<GraphUser[]> {
        const projectName = await this.getProjectName();

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
            console.log(`getAllUsersInProject() Fetched ${data.count} users for project: ${projectName}`);
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
            console.log("No users found. No users found. No users found.");
            return [];
        }

        const assignedToUsers = users.map((user: GraphUser) => `'${user.principalName}'`).join(",");
        console.log(`getTasksForUsers() Assigned users: ${assignedToUsers}`);

        const wiql: Wiql = {
            query: `
                SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.StoryPoints]
                FROM WorkItems
                WHERE [System.TeamProject] = '${projectName}'
                  AND [System.WorkItemType] = 'Task'
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
                Id: task.id,
                Title: task.fields["System.Title"],
                AssignedTo: task.fields["System.AssignedTo"]?.displayName || "Unassigned",
                State: task.fields["System.State"],
                StoryPoints: task.fields["Microsoft.VSTS.Scheduling.StoryPoints"] || "Not set"
            };

            console.log(taskDetails);
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

            console.log(`Fetched ${dataDetails} projects.`);

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
                    SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.StoryPoints]
                    FROM WorkItems
                    WHERE [System.TeamProject] = '${projectName}'
                      AND [System.WorkItemType] = 'Task'
                `
            };

            const workItemClient = await getClient(WorkItemTrackingRestClient);
            const result = await workItemClient.queryByWiql(wiql);

            if (!result.workItems || result.workItems.length === 0) {
                console.log(`No tasks found for project: ${projectName}`);
                return [];
            }

            const ids = result.workItems.map((wi) => wi.id!);
            console.log(`Found ${ids} task(s) in project: ${projectName}`);

            const workItems = await workItemClient.getWorkItems(ids, undefined, undefined, undefined, WorkItemExpand.Fields);

            workItems.forEach((task) => {
                const taskDetails = {
                    Id: task.id,
                    Title: task.fields["System.Title"],
                    AssignedTo: task.fields["System.AssignedTo"]?.displayName || "Unassigned",
                    State: task.fields["System.State"],
                    StoryPoints: task.fields["Microsoft.VSTS.Scheduling.StoryPoints"] || "Not set"
                };

                console.log(taskDetails);
            });

            return workItems;
        } catch (error) {
            console.error(`Error fetching tasks for project '${projectName}':`, error);
            return [];
        }
    }
}

const azureService = new AzureDevOpsService();

azureService
    .getAllProjectNames()
    .then(async (projectNames) => {
        console.log("All Projects:", projectNames);

        const taskPromises = projectNames.map((project: any) => azureService.getAllTasksFromProject(project));

        const results = await Promise.all(taskPromises);
        const allTasks = results.flat();

        console.log("All Tasks from All Projects:", allTasks);
    })
    .catch((error) => {
        console.error("Error fetching all tasks from projects:", error);
    });

azureService
    .getTasksForUsers()
    .then((tasks) => {
        console.log("Tasks:", tasks);
    })
    .catch((error) => {
        console.error("Error fetching tasks:", error);
    });
