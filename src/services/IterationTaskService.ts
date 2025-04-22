import { getClient } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient, Wiql, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import { getOrganizationName, AzureDevOpsService } from "./AzureDevOpsService";

export class IterationTaskService {
    private azureService = new AzureDevOpsService();

    /**
     * Gets the name of the first team in a project.
     */
    public async getTeamName(projectName: string): Promise<string> {
        const organization = await getOrganizationName();
        const token = await this.azureService.getToken();
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
        const token = await this.azureService.getToken();
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
}
