import React, { useEffect, useState } from "react";
import CurrentUserInfo from "../components/CurrentUserInfo";
import UserTasksTable from "../components/UserTasksTable";
import { CurrentUserTasksService } from "src/services/CurrentUserTasksService";

const CurrentUserTasksPage: React.FC = () => {
    const [tasksCurrentProject, setTasksCurrentProject] = useState<any[]>([]);
    const [tasksAllProjects, setTasksAllProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchTasks = async () => {
            setLoading(true);
            setError(null);
            try {
                const currentUserTasksService = new CurrentUserTasksService();
                const [current, all] = await Promise.all([
                    currentUserTasksService.getAllTaskForUser(),
                    currentUserTasksService.getAllTasksForCurrentUserAcrossProjects()
                ]);
                // Map the results to the UserTask shape expected by UserTasksTable
                const mapTask = (task: any) => ({
                    Project: task.Project,
                    Id: task.Id,
                    Title: task.Title,
                    WorkItemType: task.WorkItemType,
                    AssignedTo: task.AssignedTo,
                    State: task.State,
                    StoryPoints: task.StoryPoints,
                    Effort: task.Effort,
                    OriginalEstimate: task.OriginalEstimate,
                    RemainingWork: task.RemainingWork,
                    CompletedWork: task.CompletedWork,
                    CreatedDate: task.CreatedDate,
                    ChangedDate: task.ChangedDate
                });
                if (isMounted) {
                    setTasksCurrentProject(current.map(mapTask));
                    setTasksAllProjects(all.map(mapTask));
                }
            } catch (err: any) {
                if (isMounted) setError("Failed to load tasks");
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
            <h2>Current User Tasks</h2>
            <CurrentUserInfo />
            {loading && <div>Loading tasks...</div>}
            {error && <div style={{ color: "red" }}>{error}</div>}
            {!loading && !error && (
                <>
                    <UserTasksTable tasks={tasksCurrentProject} title="Tasks in Current Project" />
                    <UserTasksTable tasks={tasksAllProjects} title="Tasks Across All Projects" />
                </>
            )}
        </div>
    );
};

export default CurrentUserTasksPage;
