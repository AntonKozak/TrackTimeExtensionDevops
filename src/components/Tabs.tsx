import React from "react";

interface Tab {
    key: string;
    label: string;
}

interface TabsProps {
    tabs: Tab[];
    selectedTab: string;
    onTabSelect: (key: string) => void;
    className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, selectedTab, onTabSelect, className }) => (
    <div className={className} style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        {tabs.map((tab) => (
            <button
                key={tab.key}
                onClick={() => onTabSelect(tab.key)}
                style={{
                    padding: "0.5rem 1rem",
                    border: selectedTab === tab.key ? "2px solid #0078d4" : "1px solid #ccc",
                    background: selectedTab === tab.key ? "#e6f2fb" : "#fff",
                    borderRadius: 4,
                    fontWeight: selectedTab === tab.key ? "bold" : "normal",
                    cursor: "pointer"
                }}
            >
                {tab.label}
            </button>
        ))}
    </div>
);

export default Tabs;
