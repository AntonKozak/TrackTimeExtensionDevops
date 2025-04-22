import React, { useEffect, useState } from "react";
import GenericTable, { TableColumn } from "../components/GenericTable";
import { AllProjectTasksService } from "src/services/AllProjectTasksService";

const columns: TableColumn[] = [
    { header: "ID", accessor: "Id" },
    { header: "Project", accessor: "Project" },
    { header: "Title", accessor: "Title" },
    { header: "Type", accessor: "WorkItemType" },
    { header: "Assigned To", accessor: "AssignedTo" },
    { header: "State", accessor: "State" },
    { header: "Story Points", accessor: "StoryPoints" },
    { header: "Effort", accessor: "Effort" },
    { header: "Original Estimate", accessor: "OriginalEstimate" },
    { header: "Remaining Work", accessor: "RemainingWork" },
    { header: "Completed Work", accessor: "CompletedWork" },
    { header: "Created Date", accessor: "CreatedDate" },
    { header: "Changed Date", accessor: "ChangedDate" }
];

const AllProjectTasksPage: React.FC = () => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchTasks = async () => {
            setLoading(true);
            setError(null);
            try {
                const allProjectTasksService = new AllProjectTasksService();
                const projectNames = await allProjectTasksService.getAllProjectNames();
                const allTasksRaw = (
                    await Promise.all(projectNames.map((name: string) => allProjectTasksService.getAllTasksFromProject(name)))
                ).flat();
                // Map the results to the expected shape for GenericTable
                const mapTask = (task: any) => {
                    // Format dates as strings if they are Date objects
                    const createdDateRaw = task.fields?.["System.CreatedDate"] ?? task.CreatedDate ?? "Unknown";
                    const changedDateRaw = task.fields?.["System.ChangedDate"] ?? task.ChangedDate ?? "Unknown";
                    const createdDate =
                        createdDateRaw instanceof Date
                            ? createdDateRaw.toLocaleString()
                            : typeof createdDateRaw === "string"
                              ? createdDateRaw
                              : String(createdDateRaw);
                    const changedDate =
                        changedDateRaw instanceof Date
                            ? changedDateRaw.toLocaleString()
                            : typeof changedDateRaw === "string"
                              ? changedDateRaw
                              : String(changedDateRaw);
                    return {
                        Id: task.id ?? task.Id,
                        Project: task.fields?.["System.TeamProject"] ?? task.Project,
                        Title: task.fields?.["System.Title"] ?? task.Title,
                        WorkItemType: task.fields?.["System.WorkItemType"] ?? task.WorkItemType,
                        AssignedTo: task.fields?.["System.AssignedTo"]?.displayName ?? task.AssignedTo ?? "Unassigned",
                        State: task.fields?.["System.State"] ?? task.State,
                        StoryPoints: task.fields?.["Microsoft.VSTS.Scheduling.StoryPoints"] ?? task.StoryPoints ?? "Not set",
                        Effort: task.fields?.["Microsoft.VSTS.Scheduling.Effort"] ?? task.Effort ?? "Not set",
                        OriginalEstimate: task.fields?.["Microsoft.VSTS.Scheduling.OriginalEstimate"] ?? task.OriginalEstimate ?? 0,
                        RemainingWork: task.fields?.["Microsoft.VSTS.Scheduling.RemainingWork"] ?? task.RemainingWork ?? 0,
                        CompletedWork: task.fields?.["Microsoft.VSTS.Scheduling.CompletedWork"] ?? task.CompletedWork ?? 0,
                        CreatedDate: createdDate,
                        ChangedDate: changedDate
                    };
                };
                if (isMounted) setTasks(allTasksRaw.map(mapTask));
            } catch (err: any) {
                if (isMounted) setError("Failed to load all project tasks");
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchTasks();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <h2>All Project Tasks</h2>
            {loading && <div>Loading tasks...</div>}
            {error && <div style={{ color: "red" }}>{error}</div>}
            {!loading && !error && <GenericTable columns={columns} data={tasks} title="All Tasks Across All Projects" rowKey="Id" />}
        </div>
    );
};

export default AllProjectTasksPage;
