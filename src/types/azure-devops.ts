export interface WorkItem {
    id: number;
    title: string;
    type: WorkItemType;
    state: WorkItemState;
    assignedTo: string;
    originalEstimate: number;
    completedWork: number;
    taskDoneTime: string | null;
    sprint: string;
    project: string; // Added project field
}

export enum WorkItemType {
    Task = "Task",
    UserStory = "User Story",
    Bug = "Bug"
}

export enum WorkItemState {
    Active = "Active",
    Dev = "Dev/Check",
    Review = "Review",
    Done = "Done"
}

export interface TimeRangeFilter {
    type: "Week" | "Month" | "Day" | "Last3Days" | "Custom";
    customStartDate?: Date;
    customEndDate?: Date;
}

export interface SprintFilter {
    status: "Active" | "Planned" | "Done" | "All";
}

export interface FilterState {
    timeRange: TimeRangeFilter;
    sprint: SprintFilter;
    assignedTo: string[];
    type: WorkItemType[];
    state: WorkItemState[];
}
