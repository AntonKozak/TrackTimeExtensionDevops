import React, { useEffect, useState } from "react";
import GenericTable, { TableColumn } from "../components/GenericTable";
import { IterationTaskService } from "../services/IterationTaskService";
import SDK from "azure-devops-extension-sdk";
import { CommonServiceIds } from "azure-devops-extension-api";

const columns: TableColumn[] = [
    { header: "Iteration Name", accessor: "name" },
    {
        header: "Start Date",
        accessor: "startDate",
        render: (v, row) => (row.attributes?.startDate ? new Date(row.attributes.startDate).toLocaleDateString() : "N/A")
    },
    {
        header: "End Date",
        accessor: "finishDate",
        render: (v, row) => (row.attributes?.finishDate ? new Date(row.attributes.finishDate).toLocaleDateString() : "N/A")
    },
    {
        header: "# Tasks",
        accessor: "taskCount",
        render: (v, row) => row.taskCount ?? 0
    }
];

const IterationPage: React.FC = () => {
    const [iterations, setIterations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchIterations = async () => {
            setLoading(true);
            setError(null);
            try {
                await SDK.ready();
                const projectService = await SDK.getService<any>(CommonServiceIds.ProjectPageService);
                const project = await projectService.getProject();
                if (!project || !project.name) {
                    setError("Project not found");
                    setLoading(false);
                    return;
                }
                const projectName = project.name;
                const iterationTaskService = new IterationTaskService();
                const teamName = await iterationTaskService.getTeamName(projectName);
                if (!teamName || teamName === "No team found") {
                    setError("Team not found");
                    setLoading(false);
                    return;
                }
                const its = await iterationTaskService.getTeamIterations(projectName, teamName);
                const withTaskCounts = await Promise.all(
                    its.map(async (it: any) => {
                        const tasks = await iterationTaskService.getTasksForIteration(projectName, teamName, it.path);
                        return { ...it, taskCount: tasks.length };
                    })
                );
                if (isMounted) setIterations(withTaskCounts);
            } catch (err: any) {
                if (isMounted) setError("Failed to load iterations");
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchIterations();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <h2>All Iterations</h2>
            {loading && <div>Loading iterations...</div>}
            {error && <div style={{ color: "red" }}>{error}</div>}
            {!loading && !error && <GenericTable columns={columns} data={iterations} title="All Iterations" rowKey="id" />}
        </div>
    );
};

export default IterationPage;
