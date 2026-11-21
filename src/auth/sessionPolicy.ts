export type RememberState = {
  remember: boolean;
  tabMarker: boolean;
};

export function readRememberState(storage: Pick<Storage, "getItem">, tabStorage: Pick<Storage, "getItem">): RememberState {
  return {
    remember: storage.getItem("linea:remember-login") !== "0",
    tabMarker: tabStorage.getItem("linea:tab-session") === "1",
  };
}

export function shouldKeepStoredSession(hasSession: boolean, state: RememberState): boolean {
  if (!hasSession) return true;
  return state.remember || state.tabMarker;
}
