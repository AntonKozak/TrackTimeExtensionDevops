import React, { useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import "./Calendar.scss";

import { CommonServiceIds, IProjectPageService, getClient } from "azure-devops-extension-api";
import { IExtensionDataService, IExtensionDataManager, ILocationService, IHostNavigationService } from "azure-devops-extension-api/Common";
import { CoreRestClient, WebApiTeam } from "azure-devops-extension-api/Core";
import * as SDK from "azure-devops-extension-sdk";

import { Page } from "azure-devops-ui/Page";
import { AzureDevOpsService } from "./services/AzureDevOpsService";
import { Table, ITableColumn, SimpleTableCell } from "azure-devops-ui/Table";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";

const ExtensionContent: React.FC = () => {
    const [teams, setTeams] = useState<WebApiTeam[]>([]);
    const [selectedTeamName, setSelectedTeamName] = useState<string>("Select Team");
    const [error, setError] = useState<string | null>(null);
    const [tasks, setTasks] = useState<any[]>([]);

    useEffect(() => {
        SDK.init();
        const initialize = async () => {
            try {
                await SDK.ready();
                const [dataSvc, projectService, locationService, navigationService] = await Promise.all([
                    SDK.getService<IExtensionDataService>(CommonServiceIds.ExtensionDataService),
                    SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService),
                    SDK.getService<ILocationService>(CommonServiceIds.LocationService),
                    SDK.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService)
                ]);

                const project = await projectService.getProject();
                if (!project) throw new Error("Project not found");

                let selectedTeamId: string | undefined;
                const queryParams = await navigationService.getQueryParams();
                if (queryParams?.["team"]) {
                    selectedTeamId = queryParams["team"];
                }

                const accessToken = await SDK.getAccessToken();
                const dataManager: IExtensionDataManager = await dataSvc.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);

                const client = getClient(CoreRestClient);

                if (!selectedTeamId) {
                    selectedTeamId = await dataManager.getValue<string>("selected-team-" + project.id, {
                        scopeType: "User"
                    });
                }

                const allTeams: WebApiTeam[] = [];
                let fetchCount = 1000;
                let skip = 0;
                let batch: WebApiTeam[];

                do {
                    batch = await client.getTeams(project.id, false, fetchCount, skip);
                    allTeams.push(...batch);
                    skip += fetchCount;
                } while (batch.length === fetchCount);

                allTeams.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

                if (!selectedTeamId && allTeams.length > 0) {
                    selectedTeamId = allTeams[0].id;
                }

                if (selectedTeamId && (!queryParams || !queryParams["team"])) {
                    await navigationService.setQueryParams({ team: selectedTeamId });
                }

                if (selectedTeamId) {
                    try {
                        const selectedTeam = await client.getTeam(project.id, selectedTeamId);
                        setSelectedTeamName(selectedTeam.name);
                    } catch (err) {
                        console.error("Could not load selected team:", err);
                        setError("Could not load selected team");
                    }

                    await dataManager.setValue<string>("selected-team-" + project.id, selectedTeamId, { scopeType: "User" });
                }

                setTeams(allTeams);
            } catch (err: any) {
                console.error("Initialization error:", err);
                setError(err?.message || "Unknown error during initialization");
            }
        };

        initialize();
    }, []);

    // useEffect(() => {
    //     const loadTasks = async () => {
    //         const service = new AzureDevOpsService();
    //         try {
    //             const loadedTasks = await service.getAllActiveTasksAcrossProjects();
    //             setTasks(loadedTasks);
    //         } catch (err: any) {
    //             console.error("Error loading tasks", err);
    //             setError(err?.message || "Failed to load tasks.");
    //         }
    //     };

    //     loadTasks();
    // }, []);

    useEffect(() => {
        const loadTasks = async () => {
            const service = new AzureDevOpsService();
            try {
                const loadedTasks = await service.getTasksForUsers();
                setTasks(loadedTasks);
            } catch (err: any) {
                console.error("Error loading tasks", err);
                setError(err?.message || "Failed to load tasks.");
            }
        };

        loadTasks();
    }, []);

    const columns: ITableColumn<any>[] = [
        {
            id: "id",
            name: "ID",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => (
                <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                    {item.id}
                </SimpleTableCell>
            ),
            width: new ObservableValue(80)
        },
        {
            id: "title",
            name: "Title",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => (
                <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                    {item.fields?.["System.Title"] || "Untitled"}
                </SimpleTableCell>
            ),
            width: new ObservableValue(300)
        },
        {
            id: "assignedTo",
            name: "Assigned To",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const assigned = item.fields?.["System.AssignedTo"];
                const displayName = assigned?.displayName || "Unassigned";
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {displayName}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(200)
        }
    ];

    return (
        <Page className="flex-grow flex-row">
            <div className="flex-column scroll-hidden calendar-area" style={{ padding: "1rem", flex: 1 }}>
                <h1>Time Tracker</h1>
                <p>
                    Selected Team: <strong>{selectedTeamName}</strong>
                </p>
                {error && <div style={{ color: "red" }}>Error: {error}</div>}

                {tasks.length > 0 ? (
                    <Table columns={columns} itemProvider={new ArrayItemProvider<any>(tasks)} role="table" />
                ) : (
                    <p>Loading tasks...</p>
                )}
            </div>
        </Page>
    );
};

ReactDOM.render(<ExtensionContent />, document.getElementById("time-tracker-extension"));
