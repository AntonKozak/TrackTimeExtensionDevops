import React, { useEffect, useState } from "react";
import { CurrentUserTasksService } from "src/services/CurrentUserTasksService";

const CurrentUserInfo: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUserTasksService = new CurrentUserTasksService();
                const userData = await currentUserTasksService.getCurrentUser();
                setUser(userData);
            } catch (err: any) {
                setError("Failed to load user info");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    if (loading) return <div>Loading user info...</div>;
    if (error) return <div style={{ color: "red" }}>{error}</div>;
    if (!user) return <div>No user info found.</div>;

    return (
        <div style={{ marginBottom: 16 }}>
            <h3>Current User</h3>
            <div>
                <b>Display Name:</b> {user.displayName}
            </div>
            <div>
                <b>Principal Name:</b> {user.principalName}
            </div>
            <div>
                <b>Descriptor:</b> {user.descriptor}
            </div>
        </div>
    );
};

export default CurrentUserInfo;
