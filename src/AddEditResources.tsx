import React = require("react");

import { Button } from "azure-devops-ui/Button";
import { ButtonGroup } from "azure-devops-ui/ButtonGroup";
import { CustomDialog } from "azure-devops-ui/Dialog";
import { TitleSize } from "azure-devops-ui/Header";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Observer } from "azure-devops-ui/Observer";
import { PanelHeader, PanelFooter, PanelContent } from "azure-devops-ui/Panel";
import { TextField } from "azure-devops-ui/TextField";

import { MessageDialog } from "./MessageDialog";
import { Calendar } from "@fullcalendar/core";
import { FreeFormEventsSource } from "./FreeFormEventSource";
import { FreeFormResourceSource, IResource } from "./FreeformResourceSource";

export interface IAddEditResourcesDialogProps {
    /**
     * Calendar API to refresh after changes
     */
    calendarApi: Calendar;

    /**
     * Object that stores all event data
     */
    eventSource: FreeFormEventsSource;

    /**
     * Resource manager
     */
    resourceSource?: FreeFormResourceSource;

    /**
     * Callback function on dialog dismiss
     */
    onDismiss: () => void;
}

/**
 * Dialog that lets users manage resources
 */
export class AddEditResourcesDialog extends React.Component<IAddEditResourcesDialogProps> {
    private newResourceTitle: ObservableValue<string> = new ObservableValue<string>("");
    private message: ObservableValue<string> = new ObservableValue<string>("");
    private selectedResourceId: ObservableValue<string> = new ObservableValue<string>("");
    private isDeleteConfirmationOpen: ObservableValue<boolean> = new ObservableValue<boolean>(false);
    private editingResourceId: string = "";
    private editingResourceTitle: ObservableValue<string> = new ObservableValue<string>("");
    private isEditing: ObservableValue<boolean> = new ObservableValue<boolean>(false);

    constructor(props: IAddEditResourcesDialogProps) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <>
                <CustomDialog onDismiss={this.props.onDismiss}>
                    <PanelHeader
                        onDismiss={this.props.onDismiss}
                        showCloseButton={false}
                        titleProps={{ size: TitleSize.Small, text: "Manage Resources" }}
                    />
                    <PanelContent>
                        <div className="flex-grow flex-column event-dialog-content">
                            <Observer message={this.message}>
                                {(props: { message: string }) => {
                                    return props.message !== "" ? (
                                        <MessageCard className="flex-self-stretch" severity={MessageCardSeverity.Info}>
                                            {props.message}
                                        </MessageCard>
                                    ) : null;
                                }}
                            </Observer>

                            <h3>Current Resources</h3>
                            <div className="resource-list">{this.renderResourceList()}</div>

                            <Observer isEditing={this.isEditing}>
                                {(props: { isEditing: boolean }) => {
                                    return props.isEditing ? (
                                        <div className="input-row flex-row">
                                            <span>Edit Resource</span>
                                            <div className="flex-column column-2">
                                                <TextField
                                                    placeholder="Resource name"
                                                    value={this.editingResourceTitle}
                                                    onChange={this.onEditResourceTitleChange}
                                                />
                                                <div className="button-row" style={{ marginTop: "8px" }}>
                                                    <ButtonGroup>
                                                        <Button text="Cancel" onClick={this.cancelEditing} />
                                                        <Button
                                                            text="Save"
                                                            primary={true}
                                                            onClick={this.saveEditedResource}
                                                            disabled={!this.editingResourceTitle.value.trim()}
                                                        />
                                                    </ButtonGroup>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="input-row flex-row">
                                            <span>Add Resource</span>
                                            <div className="flex-column column-2">
                                                <TextField
                                                    placeholder="Resource name"
                                                    value={this.newResourceTitle}
                                                    onChange={this.onNewResourceTitleChange}
                                                />
                                                <div className="button-row" style={{ marginTop: "8px" }}>
                                                    <Button text="Add" primary={true} onClick={this.addNewResource} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }}
                            </Observer>
                        </div>
                    </PanelContent>
                </CustomDialog>

                <Observer isDialogOpen={this.isDeleteConfirmationOpen}>
                    {(props: { isDialogOpen: boolean }) => {
                        return props.isDialogOpen ? (
                            <MessageDialog
                                message="Are you sure you want to delete this resource? Events associated with this resource might lose their assignment."
                                onConfirm={this.confirmResourceDelete}
                                onDismiss={() => {
                                    this.isDeleteConfirmationOpen.value = false;
                                }}
                                title="Delete Resource"
                            />
                        ) : null;
                    }}
                </Observer>
            </>
        );
    }

    private renderResourceList = (): JSX.Element => {
        return (
            <Observer resources={this.props.resourceSource?.getResourcesObservable()}>
                {(props: { resources: IResource[] }) => {
                    return (
                        <div className="resources-list">
                            {props.resources.map((resource) => (
                                <div
                                    key={resource.id}
                                    className="flex-row"
                                    style={{
                                        padding: "8px 0",
                                        borderBottom: "1px solid #eaeaea",
                                        alignItems: "center"
                                    }}
                                >
                                    <div style={{ flexGrow: 1 }}>{resource.title}</div>
                                    <ButtonGroup>
                                        <Button
                                            iconProps={{ iconName: "Edit" }}
                                            subtle={true}
                                            onClick={() => this.startEditingResource(resource)}
                                            tooltipProps={{ text: "Edit resource" }}
                                        />
                                        <Button
                                            iconProps={{ iconName: "Delete" }}
                                            subtle={true}
                                            onClick={() => this.deleteResource(resource.id)}
                                            tooltipProps={{ text: "Delete resource" }}
                                        />
                                    </ButtonGroup>
                                </div>
                            )) || <div style={{ padding: "8px 0" }}>No resources added yet.</div>}
                        </div>
                    );
                }}
            </Observer>
        );
    };

    private onNewResourceTitleChange = (e: React.ChangeEvent, value: string): void => {
        this.newResourceTitle.value = value;
    };

    private onEditResourceTitleChange = (e: React.ChangeEvent, value: string): void => {
        this.editingResourceTitle.value = value;
    };

    private addNewResource = (): void => {
        const title = this.newResourceTitle.value.trim();
        if (!title) {
            this.message.value = "Resource name cannot be empty";
            return;
        }

        try {
            // Use resourceSource instead of eventSource
            if (this.props.resourceSource) {
                this.props.resourceSource
                    .addResource(title)
                    .then(() => {
                        // Reset form
                        this.newResourceTitle.value = "";
                        this.message.value = `Resource "${title}" has been added`;

                        // Refresh calendar to show new resource
                        this.props.calendarApi.refetchResources();
                    })
                    .catch((error) => {
                        this.message.value = `Failed to add resource: ${error.message}`;
                    });
            } else {
                this.message.value = "Resource source not available";
            }
        } catch (error) {
            this.message.value = `Failed to add resource: check console for details`;
            console.error("Failed to add resource:", error);
        }
    };

    private startEditingResource = (resource: { id: string; title: string }): void => {
        this.editingResourceId = resource.id;
        this.editingResourceTitle.value = resource.title;
        this.isEditing.value = true;
    };

    private cancelEditing = (): void => {
        this.editingResourceId = "";
        this.editingResourceTitle.value = "";
        this.isEditing.value = false;
    };

    private saveEditedResource = (): void => {
        const title = this.editingResourceTitle.value.trim();
        if (!title) {
            this.message.value = "Resource name cannot be empty";
            return;
        }

        try {
            if (this.props.resourceSource) {
                this.props.resourceSource
                    .updateResource(this.editingResourceId, title)
                    .then(() => {
                        // Reset form
                        this.cancelEditing();
                        this.message.value = `Resource has been updated`;

                        // Refresh calendar
                        this.props.calendarApi.refetchResources();
                    })
                    .catch((error) => {
                        this.message.value = `Failed to update resource: ${error.message}`;
                    });
            } else {
                this.message.value = "Resource source not available";
            }
        } catch (error) {
            this.message.value = `Failed to update resource: `;
        }
    };

    private deleteResource = (resourceId: string): void => {
        this.selectedResourceId.value = resourceId;
        this.isDeleteConfirmationOpen.value = true;
    };

    private confirmResourceDelete = (): void => {
        try {
            if (this.props.resourceSource) {
                this.props.resourceSource
                    .deleteResource(this.selectedResourceId.value)
                    .then(() => {
                        // Close confirmation dialog
                        this.isDeleteConfirmationOpen.value = false;

                        // Reset selected resource
                        this.selectedResourceId.value = "";

                        // Show success message
                        this.message.value = "Resource has been deleted";

                        // Refresh calendar
                        this.props.calendarApi.refetchResources();
                    })
                    .catch((error) => {
                        this.message.value = `Failed to delete resource: ${error.message}`;
                    });
            } else {
                this.message.value = "Resource source not available";
            }
        } catch (error) {
            this.message.value = `Failed to delete resource:`;
        }
    };
}
