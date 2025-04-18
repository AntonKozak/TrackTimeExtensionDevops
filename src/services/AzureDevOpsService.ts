import { getClient, CommonServiceIds } from "azure-devops-extension-api";
import { GraphRestClient, GraphUser } from "azure-devops-extension-api/Graph";
import { WorkItemTrackingRestClient, Wiql, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import SDK from "azure-devops-extension-sdk";

export class AzureDevOpsService {
    private static readonly organization = "AntonKozak"; // Replace with your Azure DevOps organization name
    private static readonly token = "1sCmEWoNZtRZe7OX6PqAW7qJeLkeaWF9E6bH6hQkzoJtUZlO53bdJQQJ99BDACAAAAAAAAAAAAASAZDO2vdt"; // Hardcoded PAT

    private async getProjectName(): Promise<string> {
        console.log("Fetching project name...");
        const projectService = await SDK.getService<any>(CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();

        if (!project || !project.name) {
            throw new Error("Project not found");
        }

        console.log(`Project name: ${project.name}`);
        return project.name;
    }

    private async getAllUsersInProject(): Promise<GraphUser[]> {
        console.log("Fetching all users in project...");
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
            console.log(`Fetched ${data.count} users for project: ${projectName}`);
            return data.value;
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    }

    public async getTasksForUsers(): Promise<any[]> {
        console.log("Fetching tasks for users...");
        const projectName = await this.getProjectName();
        const users = await this.getAllUsersInProject();

        if (!users.length) {
            console.log("No users found.");
            return [];
        }

        const assignedToUsers = users.map((user: GraphUser) => `'${user.principalName}'`).join(",");
        console.log(`Assigned users: ${assignedToUsers}`);

        const wiql: Wiql = {
            query: `
                SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
                FROM WorkItems
                WHERE [System.TeamProject] = '${projectName}'
                  AND [System.WorkItemType] = 'Task'
                  AND [System.AssignedTo] IN (${assignedToUsers})
            `
        };

        console.log("Querying work items...");
        const workItemClient = await getClient(WorkItemTrackingRestClient);
        const result = await workItemClient.queryByWiql(wiql);

        if (!result.workItems || result.workItems.length === 0) {
            console.log("No tasks found.");
            return [];
        }

        const ids = result.workItems.map((wi) => wi.id!);
        console.log(`Found ${ids.length} work items, retrieving details...`);

        const workItems = await workItemClient.getWorkItems(ids, undefined, undefined, undefined, WorkItemExpand.Fields);
        console.log(`Retrieved ${workItems.length} work item details.`);

        return workItems;
    }

    // public async getAllActiveTasksAcrossProjects(): Promise<any[]> {
    //     console.log("Fetching all active tasks across all projects...");

    //     const url = `https://vssps.dev.azure.com/${AzureDevOpsService.organization}/_apis/wit/wiql?api-version=7.1-preview.1`;
    //     const wiql = {
    //         query: `
    //             SELECT [System.Id], [System.Title], [System.State], [System.TeamProject], [System.AssignedTo]
    //             FROM WorkItems
    //             WHERE [System.WorkItemType] = 'Task'
    //               AND [System.State] NOT IN ('Closed', 'Done', 'Removed')
    //               AND [System.AssignedTo] = @Me
    //         `
    //     };

    //     try {
    //         const response = await fetch(url, {
    //             method: "POST",
    //             headers: {
    //                 Authorization: `Bearer ${AzureDevOpsService.token}`,
    //                 "Content-Type": "application/json"
    //             },
    //             body: JSON.stringify(wiql)
    //         });

    //         if (!response.ok) {
    //             throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    //         }

    //         const result = await response.json();
    //         const ids = result.workItems.map((wi: any) => wi.id);
    //         console.log(`Found ${ids.length} active work items.`);

    //         if (!ids.length) return [];

    //         const detailsUrl = `https://vssps.dev.azure.com/${AzureDevOpsService.organization}/_apis/wit/workitemsbatch?api-version=7.1-preview.1`;
    //         const detailsResponse = await fetch(detailsUrl, {
    //             method: "POST",
    //             headers: {
    //                 Authorization: `Bearer ${AzureDevOpsService.token}`,
    //                 "Content-Type": "application/json"
    //             },
    //             body: JSON.stringify({
    //                 ids: ids,
    //                 fields: ["System.Id", "System.Title", "System.State", "System.AssignedTo", "System.TeamProject"]
    //             })
    //         });

    //         if (!detailsResponse.ok) {
    //             throw new Error(`Failed to fetch task details: ${detailsResponse.statusText}`);
    //         }

    //         const details = await detailsResponse.json();
    //         console.log(`Retrieved ${details.value.length} work item details.`);
    //         return details.value;
    //     } catch (error) {
    //         console.error("Error fetching all active tasks:", error);
    //         return [];
    //     }
    // }
}

const azureService = new AzureDevOpsService();
azureService
    .getTasksForUsers()
    .then((tasks) => {
        console.log("Tasks:", tasks);
    })
    .catch((error) => {
        console.error("Error fetching tasks:", error);
    });
