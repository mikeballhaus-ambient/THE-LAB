import { Ref, ref } from "vue";
import { SessionManager } from "../composables/session/session-manager";
import { labDB, type SessionDataRecord } from "../types/lab-db";
import type { UIChatMessage, TodoList } from "../types";

export interface IStore<T> {
    sessionManager: SessionManager;
    STORAGE_KEY: string;
    itemsMap: Ref<Map<string, T[]>>;
    getItems(sessionId: string): T[];
    saveItem(sessionId: string, items: T): void;
    updateItems(sessionId: string, items: T[]): void;
    deleteItems(sessionId: string): void;
    clearAll(): void;
}

export class Store<T> implements IStore<T> {

    STORAGE_KEY: string;
    sessionManager: SessionManager;
    itemsMap: Ref<Map<string, T[]>> = ref(new Map())

    constructor(storageKey: string, sessionManager: SessionManager) {
        this.STORAGE_KEY = storageKey
        this.sessionManager = sessionManager
    }

    async init(): Promise<void> {
        await this.loadFromDB();
    }

    private async loadFromDB(): Promise<void> {
        try {
            let records: { sessionId: string; items: T[] }[] = [];

            if (this.STORAGE_KEY === 'lab_chat_messages') {
                const chatRecords: SessionDataRecord<UIChatMessage>[] = await labDB.chatMessages.toArray();
                records = chatRecords.map((r) => ({ sessionId: r.sessionId, items: r.items as T[] }));
            } else if (this.STORAGE_KEY === 'lab_chat_todolists') {
                const todoRecords: SessionDataRecord<TodoList>[] = await labDB.todoLists.toArray();
                records = todoRecords.map((r) => ({ sessionId: r.sessionId, items: r.items as T[] }));
            }

            const newMap = new Map<string, T[]>();
            records.forEach(r => {
                newMap.set(r.sessionId, [...r.items]);
            });
            this.itemsMap.value = newMap;

        } catch (error) {
            console.error('Failed to load itemsMap from storage:', error);
        }
    }

    public getItems(sessionId: string): T[] {
        const result = this.itemsMap.value.get(sessionId) || [];
        const serializable = this.toSerializable(result);
        return [...serializable];
    }

    public async saveItem(sessionId: string, item: T): Promise<void> {
        const safeItem = this.toSerializable(item);
        const existing = this.getItems(sessionId);
        const updated = [...existing, safeItem];

        this.itemsMap.value = new Map(this.itemsMap.value).set(sessionId, updated);
        await this.persist(sessionId, updated);
    }

    public async updateItems(sessionId: string, items: T[]): Promise<void> {
        const safeItems = this.toSerializable(items);
        this.itemsMap.value = new Map(this.itemsMap.value).set(sessionId, [...safeItems]);
        await this.persist(sessionId, safeItems);
    }

    public async deleteItems(sessionId: string): Promise<void> {
        const newMap = new Map(this.itemsMap.value);
        newMap.delete(sessionId);
        this.itemsMap.value = newMap;

        if (this.STORAGE_KEY === 'lab_chat_messages') {
            await labDB.chatMessages.delete(sessionId);
        } else {
            await labDB.todoLists.delete(sessionId);
        }
    }

    public clearAll(): void {
        this.itemsMap.value = new Map();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({}));
    }

    private async persist(sessionId: string, items: T[]): Promise<void> {
        const serializableItems = JSON.parse(JSON.stringify(items)) as T[];
        const record = { sessionId, items: serializableItems };

        if (this.STORAGE_KEY === 'lab_chat_messages') {
            await labDB.chatMessages.put(record as SessionDataRecord<UIChatMessage>);
        } else {
            await labDB.todoLists.put(record as SessionDataRecord<TodoList>);
        }
    }

    private toSerializable<T>(obj: T): T {
        const result = JSON.parse(JSON.stringify(obj));
        return result;
    }

}