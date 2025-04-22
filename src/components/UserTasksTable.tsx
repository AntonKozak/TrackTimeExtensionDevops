import React from "react";
import GenericTable, { TableColumn } from "./GenericTable";

interface UserTask {
    Project: string;
    Id: number;
    Title: string;
    WorkItemType: string;
    AssignedTo: string;
    State: string;
    StoryPoints: string | number;
    Effort: string | number;
    OriginalEstimate: number;
    RemainingWork: number;
    CompletedWork: number;
    CreatedDate: string;
    ChangedDate: string;
}

interface UserTasksTableProps {
    tasks: UserTask[];
    title?: string;
}

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
    {
        header: "Created Date",
        accessor: "CreatedDate",
        render: (value) => {
            if (!value) return "";
            const date = new Date(value);
            return isNaN(date.getTime()) ? value : date.toLocaleString();
        }
    },
    {
        header: "Changed Date",
        accessor: "ChangedDate",
        render: (value) => {
            if (!value) return "";
            const date = new Date(value);
            return isNaN(date.getTime()) ? value : date.toLocaleString();
        }
    }
];

const UserTasksTable: React.FC<UserTasksTableProps> = ({ tasks, title }) => {
    return <GenericTable columns={columns} data={tasks} title={title} rowKey="Id" />;
};

export default UserTasksTable;
