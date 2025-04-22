import { getClient } from "azure-devops-extension-api";
import { Wiql, WorkItemTrackingRestClient, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import { getOrganizationName, AzureDevOpsService } from "./AzureDevOpsService";

// AllProjectTasksService: Handles all tasks across all projects
export class AllProjectTasksService {
    private azureService = new AzureDevOpsService();

    /**
     * Gets all project names in the organization.
     */
    public async getAllProjectNames() {
        const organization = await getOrganizationName();
        const token = await this.azureService.getToken();
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
}
