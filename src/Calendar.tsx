import React, { useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import "./Calendar.scss";

import { CommonServiceIds, IProjectPageService } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";

import { Page } from "azure-devops-ui/Page";
import CurrentUserTasksPage from "./pages/CurrentUserTasksPage";
import AllProjectTasksPage from "./pages/AllProjectTasksPage";
import CurrentProjectTasksPage from "./pages/CurrentProjectTasksPage";
import Tabs from "./components/Tabs";
import IterationPage from "./pages/IterationPage";

const TABS = [
    { key: "iterations", label: "Iterations" },
    { key: "currentProjectTasks", label: "Current Project Tasks" },
    { key: "allProjectTasks", label: "All Project Tasks" },
    { key: "сurrentUserTasks", label: "Current User Tasks" }
];

const ExtensionContent: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<string>(TABS[0].key);

    useEffect(() => {
        SDK.init();
        const initialize = async () => {
            try {
                await SDK.ready();
                const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
                const project = await projectService.getProject();
                if (!project) throw new Error("Project not found");
            } catch (err: any) {
                setError(err?.message || "Unknown error during initialization");
            }
        };
        initialize();
    }, []);

    const renderTabContent = () => {
        switch (selectedTab) {
            case "iterations":
                return (
                    <>
                        <h2>Iterations</h2>
                        <IterationPage />
                    </>
                );
            case "currentProjectTasks":
                return (
                    <>
                        <h2>Current Project Tasks</h2>
                        <CurrentProjectTasksPage />
                    </>
                );
            case "allProjectTasks":
                return (
                    <>
                        <h2>All Project Tasks</h2>
                        <AllProjectTasksPage />
                    </>
                );
            case "сurrentUserTasks":
                return (
                    <>
                        <h2>Current User Tasks</h2>
                        <CurrentUserTasksPage />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Page className="flex-grow flex-row">
            <div className="flex-column scroll-hidden calendar-area" style={{ padding: "1rem", flex: 1 }}>
                <h1>Time Tracker</h1>
                <Tabs tabs={TABS} selectedTab={selectedTab} onTabSelect={setSelectedTab} />
                {error && <div style={{ color: "red" }}>Error: {error}</div>}
                {renderTabContent()}
            </div>
        </Page>
    );
};

ReactDOM.render(<ExtensionContent />, document.getElementById("time-tracker-extension"));
