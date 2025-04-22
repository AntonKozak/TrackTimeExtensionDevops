import React from "react";

export interface TableColumn {
    header: string;
    accessor: string;
    render?: (value: any, row: any) => React.ReactNode;
}

interface GenericTableProps {
    columns: TableColumn[];
    data: any[];
    title?: string;
    rowKey?: string;
    emptyText?: string;
}

const GenericTable: React.FC<GenericTableProps> = ({ columns, data, title, rowKey = "id", emptyText = "No data found." }) => {
    return (
        <div style={{ marginBottom: 24 }}>
            {title && <h3>{title}</h3>}
            {!data || data.length === 0 ? (
                <div>{emptyText}</div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.accessor}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={row[rowKey] ?? idx}>
                                {columns.map((col) => (
                                    <td key={col.accessor}>{col.render ? col.render(row[col.accessor], row) : (row[col.accessor] ?? "")}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default GenericTable;
