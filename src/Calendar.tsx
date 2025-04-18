// No changes here
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
    const [projectTasks, setProjectTasks] = useState<any[]>([]);
    const [allTasks, setAllTasks] = useState<any[]>([]);

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

                const accessToken = await SDK.getAccessToken();
                const dataManager: IExtensionDataManager = await dataSvc.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
                const client = getClient(CoreRestClient);

                const queryParams = await navigationService.getQueryParams();
                let selectedTeamId =
                    queryParams?.["team"] || (await dataManager.getValue<string>("selected-team-" + project.id, { scopeType: "User" }));

                const allTeams: WebApiTeam[] = [];
                let skip = 0;
                const fetchCount = 1000;
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
                    const selectedTeam = await client.getTeam(project.id, selectedTeamId);
                    setSelectedTeamName(selectedTeam.name);
                    await dataManager.setValue<string>("selected-team-" + project.id, selectedTeamId, { scopeType: "User" });
                }

                setTeams(allTeams);

                const service = new AzureDevOpsService();
                const currentProjectTasks = await service.getTasksForUsers();
                const projectNames = await service.getAllProjectNames();

                const tasksAcrossProjects = await Promise.all(projectNames.map((project: any) => service.getAllTasksFromProject(project)));
                const flattenedTasks = tasksAcrossProjects.flat();

                setProjectTasks(currentProjectTasks);
                setAllTasks(flattenedTasks);
            } catch (err: any) {
                console.error("Initialization error:", err);
                setError(err?.message || "Unknown error during initialization");
            }
        };

        initialize();
    }, []);

    const columns: ITableColumn<any>[] = [
        {
            id: "id",
            name: "ID",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => (
                <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                    {item?.id ?? "N/A"}
                </SimpleTableCell>
            ),
            width: new ObservableValue(80)
        },
        {
            id: "title",
            name: "Title",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const title = item?.fields?.["System.Title"] || "Untitled";
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {title}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(300)
        },
        {
            id: "assignedTo",
            name: "Assigned To",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const assignedTo = item?.fields?.["System.AssignedTo"];
                const displayName = assignedTo?.displayName || "Unassigned";
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {displayName}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(200)
        },
        {
            id: "state",
            name: "State",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const state = item?.fields?.["System.State"] || "Unknown";
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {state}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(120)
        },
        {
            id: "type",
            name: "Type",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const workItemType = item?.fields?.["System.WorkItemType"] || "N/A";
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {workItemType}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(120)
        },
        {
            id: "storyPoints",
            name: "Story Points",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const value = item?.fields?.["Microsoft.VSTS.Scheduling.StoryPoints"];
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {value !== undefined ? value : "Not set"}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(100)
        },
        {
            id: "originalEstimate",
            name: "Original Estimate",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const value = item?.fields?.["Microsoft.VSTS.Scheduling.OriginalEstimate"];
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {value ?? 0}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(120)
        },
        {
            id: "remainingWork",
            name: "Remaining Work",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const value = item?.fields?.["Microsoft.VSTS.Scheduling.RemainingWork"];
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {value ?? 0}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(120)
        },
        {
            id: "completedWork",
            name: "Completed Work",
            renderCell: (rowIndex, columnIndex, tableColumn, item) => {
                const value = item?.fields?.["Microsoft.VSTS.Scheduling.CompletedWork"];
                return (
                    <SimpleTableCell columnIndex={columnIndex} key={`col-${columnIndex}`}>
                        {value ?? 0}
                    </SimpleTableCell>
                );
            },
            width: new ObservableValue(120)
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

                <h2>Current Project Tasks</h2>
                {projectTasks.length === 0 ? (
                    <p>Loading current project tasks...</p>
                ) : (
                    <Table columns={columns} itemProvider={new ArrayItemProvider<any>(projectTasks)} role="table" />
                )}

                <h2 style={{ marginTop: "2rem" }}>All Project Tasks</h2>
                {allTasks.length === 0 ? (
                    <p>Loading all tasks...</p>
                ) : (
                    <Table columns={columns} itemProvider={new ArrayItemProvider<any>(allTasks)} role="table" />
                )}
            </div>
        </Page>
    );
};

ReactDOM.render(<ExtensionContent />, document.getElementById("time-tracker-extension"));
