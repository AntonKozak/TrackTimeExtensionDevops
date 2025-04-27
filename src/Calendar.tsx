import React, { useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import "./Calendar.scss";
import { Page } from "azure-devops-ui/Page";

import { CommonServiceIds, IProjectPageService } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";

const TABS = [
    { key: "iterations", label: "Iterations" },
    { key: "currentProjectTasks", label: "Current Project Tasks" },
    { key: "allProjectTasks", label: "All Project Tasks" },
    { key: "сurrentUserTasks", label: "Current User Tasks" }
];

const ExtensionContent: React.FC = () => {
    const [error, setError] = useState<string | null>(null);

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

    return (
        <Page className="flex-grow flex-row">
            <div className="flex-column scroll-hidden calendar-area" style={{ padding: "1rem", flex: 1 }}>
                <h1>Time Tracker</h1>
            </div>
        </Page>
    );
};

ReactDOM.render(<ExtensionContent />, document.getElementById("time-tracker-extension"));
