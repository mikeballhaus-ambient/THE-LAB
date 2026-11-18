import { IApp, IServerConfig, ILifecycleHooks, AppMetadata, ChangelogEntry, AppType } from './app.d';

export class App implements IApp {
    id: string;
    name: string;
    description: string;
    faIcon: string;
    order: number;
    type: AppType;
    componentPath: string | undefined;
    metadata: AppMetadata;
    isEnabled: boolean;
    isServerSideEnabled?: boolean;
    lifecycle?: ILifecycleHooks;
    appSystemInstructions?: string;

    // Dependencies
    dependencies: string[] = [];
    optionalDependencies: string[] = [];
    requiresPort?: number;

    // Versioning
    version: string = '1.0.0';
    changelog: ChangelogEntry[] = [];
    latestVersion?: string;
    isUpdateAvailable?: boolean;
    server?: IServerConfig;

    // Hot reload support
    protected reload(): void {
        console.log('App reload triggered');
    }

    emitReload(): void {
        console.log('App reload signal emitted');
    }

    constructor(
        id: string,
        name: string,
        description: string,
        faIcon: string,
        order: number,
        type: 'browser' | 'server',
        componentPath: string | undefined,
        isServerSideEnabled: boolean,
        server?: IServerConfig,
        appSystemInstructions?: string
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.faIcon = faIcon;
        this.order = order;
        this.type = type;
        this.componentPath = componentPath;
        this.metadata = {
            category: 'general',
            author: 'developer',
            version: '1.0.0',
            tags: []
        };
        this.isEnabled = true;
        this.isServerSideEnabled = isServerSideEnabled;
        this.server = server;
        this.appSystemInstructions = appSystemInstructions;
    }
}

export * from './app.d'
