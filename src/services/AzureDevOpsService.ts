import SDK from "azure-devops-extension-sdk";

export async function getOrganizationName(): Promise<string> {
    await SDK.ready();
    const config = SDK.getConfiguration();
    let url = "";
    if (config && config.baseUri) {
        url = config.baseUri;
    } else {
        url = window.location.origin;
    }
    const parts = url.split("/");
    let org = parts[parts.length - 1] || parts[parts.length - 2];
    if (org === "localhost:8888") {
        org = "AntonKozak";
    }
    console.log("[getOrganizationName] baseUri:", url, "organization:", org);
    return org;
}

export class AzureDevOpsService {
    async getToken() {
        await SDK.ready();
        const token = await SDK.getAccessToken();
        console.log("[AzureDevOpsService] token:", token);
        return token;
    }
}
