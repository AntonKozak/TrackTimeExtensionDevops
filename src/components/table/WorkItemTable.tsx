import React, { useEffect, useState } from "react";
import { AzureDevOpsService } from "../../services/AzureDevOpsService";
import { WorkItem } from "../../types/azure-devops";

const headers = [
    { key: "week", label: "This week" },
    { key: "sprint", label: "Sprint" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "type", label: "Type" },
    { key: "title", label: "Task Title" },
    { key: "state", label: "State" },
    { key: "originalEstimate", label: "Original Est." },
    { key: "completedWork", label: "Completed" },
    { key: "taskDoneTime", label: "Task Done Time" }
];

const azureService = new AzureDevOpsService();

export const WorkItemTable: React.FC = () => {
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [sortKey, setSortKey] = useState<string>("week");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        azureService.getTasksForUsers().then((items: any[]) => {
            setWorkItems(items as WorkItem[]);
            setLoading(false);
        });
    }, []);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const sortedItems = [...workItems].sort((a: any, b: any) => {
        if (a[sortKey] < b[sortKey]) return sortOrder === "asc" ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    return (
        <div>
            <div style={{ marginBottom: 8 }}>
                {/* Example: Add dropdowns/buttons for filtering/sorting here */}
                <button onClick={() => handleSort("week")}>Sort by Week</button>
                <button onClick={() => handleSort("sprint")}>Sort by Sprint</button>
                <button onClick={() => handleSort("assignedTo")}>Sort by Assigned To</button>
                {/* Add more controls as needed */}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        {headers.map((h) => (
                            <th key={h.key} style={{ borderBottom: "1px solid #ccc", cursor: "pointer" }} onClick={() => handleSort(h.key)}>
                                {h.label} {sortKey === h.key ? (sortOrder === "asc" ? "▲" : "▼") : null}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={headers.length}>Loading...</td>
                        </tr>
                    ) : sortedItems.length === 0 ? (
                        <tr>
                            <td colSpan={headers.length}>No data</td>
                        </tr>
                    ) : (
                        sortedItems.map((item, idx) => (
                            <tr key={item.id || idx}>
                                <td>{/* This week: implement logic as needed */}</td>
                                <td>{item.sprint}</td>
                                <td>{item.assignedTo}</td>
                                <td>{item.type}</td>
                                <td>{item.title}</td>
                                <td>{item.state}</td>
                                <td>{item.originalEstimate}</td>
                                <td>{item.completedWork}</td>
                                <td>{item.taskDoneTime}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
