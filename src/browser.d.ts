// Only the promise-based WebExtension APIs used by this extension.
// Both Firefox and Chrome MV3 provide this surface.
interface ExtensionAPI {
  tabs: {
    query(options: { active: boolean; currentWindow: boolean }): Promise<
      Array<{
        id?: number;
        url?: string;
      }>
    >;
  };
  scripting: {
    executeScript<T>(options: {
      target: { tabId: number };
      func: () => Promise<T>;
    }): Promise<Array<{ result?: T }>>;
  };
}

declare var browser: ExtensionAPI | undefined;
declare var chrome: ExtensionAPI | undefined;
