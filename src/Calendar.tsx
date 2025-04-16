import React, { useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import "./Calendar.scss";
import { CommonServiceIds, IProjectPageService, getClient } from "azure-devops-extension-api";
import { IExtensionDataService, IExtensionDataManager, ILocationService, IHostNavigationService } from "azure-devops-extension-api/Common";
import { CoreRestClient, WebApiTeam } from "azure-devops-extension-api/Core";
import * as SDK from "azure-devops-extension-sdk";
import { Page } from "azure-devops-ui/Page";

const ExtensionContent: React.FC = () => {
    const [teams, setTeams] = useState<WebApiTeam[]>([]);
    const [selectedTeamName, setSelectedTeamName] = useState<string>("Select Team");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        SDK.init();
        const initialize = async () => {
            try {
                const dataSvc = await SDK.getService<IExtensionDataService>(CommonServiceIds.ExtensionDataService);
                const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
                const project = await projectService.getProject();
                const locationService = await SDK.getService<ILocationService>(CommonServiceIds.LocationService);
                const dataManager = await dataSvc.getExtensionDataManager(SDK.getExtensionContext().id, await SDK.getAccessToken());
                const navigationService = await SDK.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
                const queryParam = await navigationService.getQueryParams();
                let selectedTeamId;
                if (queryParam && queryParam["team"]) {
                    selectedTeamId = queryParam["team"];
                }
                if (project) {
                    if (!selectedTeamId) {
                        selectedTeamId = await dataManager.getValue<string>("selected-team-" + project.id, { scopeType: "User" });
                    }
                    const client = getClient(CoreRestClient);
                    const allTeams: WebApiTeam[] = [];
                    let teamsBatch;
                    let callCount = 0;
                    const fetchCount = 1000;
                    do {
                        teamsBatch = await client.getTeams(project.id, false, fetchCount, callCount * fetchCount);
                        allTeams.push(...teamsBatch);
                        callCount++;
                    } while (teamsBatch.length === fetchCount);
                    allTeams.sort((a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase()));
                    if (!selectedTeamId) {
                        selectedTeamId = allTeams[0]?.id;
                    }
                    if (!queryParam || !queryParam["team"]) {
                        navigationService.setQueryParams({ team: selectedTeamId });
                    }
                    try {
                        setSelectedTeamName((await client.getTeam(project.id, selectedTeamId)).name);
                    } catch (error) {
                        setError(`Failed to get team with ID ${selectedTeamId}: ${error}`);
                    }
                    dataManager.setValue<string>("selected-team-" + project.id, selectedTeamId, { scopeType: "User" });
                    setTeams(allTeams);
                }
            } catch (err: any) {
                setError(err.message || String(err));
            }
        };
        initialize();
    }, []);

    return (
        <Page className="flex-grow flex-row">
            <div className="flex-column scroll-hidden calendar-area">
                <h1>Time Tracker</h1>
                {error && <div style={{ color: "red" }}>Error: {error}</div>}
                {/* You can render teams or selectedTeamName here if needed */}
            </div>
        </Page>
    );
};

ReactDOM.render(<ExtensionContent />, document.getElementById("time-tracker-extension"));
