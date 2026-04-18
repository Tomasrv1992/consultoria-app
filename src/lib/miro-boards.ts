export interface MiroBoard {
  boardId: string;
  widgetId: string;
  estadoColumnId?: string;
  completadaOptionId?: string;
  historicoDocId?: string;
}

export const MIRO_BOARDS: Record<string, MiroBoard> = {
  "client-cygnuss": {
    boardId: "uXjVGVc5G44=",
    widgetId: "3458764667959790602",
    estadoColumnId: "a62fa838-1c68-481c-b8af-aa113ee40a82",
    completadaOptionId: "completada",
    historicoDocId: "3458764666847043754",
  },
  "client-dentilandia": {
    boardId: "uXjVGMGFP5o=",
    widgetId: "3458764667959702763",
    estadoColumnId: "57b7c23f-994f-4f19-b2a9-e0575cef9ce6",
    completadaOptionId: "completada",
    historicoDocId: "3458764666848561440",
  },
  "client-acautos": {
    boardId: "uXjVGNKVGKI=",
    widgetId: "3458764667959833246",
    estadoColumnId: "2e01acde-467a-4dda-96c0-7d41530857e1",
    completadaOptionId: "completada",
    historicoDocId: "3458764666848453651",
  },
  "client-paulina": {
    boardId: "uXjVGNKZkmM=",
    widgetId: "3458764667959874411",
    estadoColumnId: "a7e42174-55bd-4342-be1b-45d105019d29",
    completadaOptionId: "completada",
    historicoDocId: "3458764668081659633",
  },
  "c5": {
    boardId: "uXjVGrJ405k=",
    widgetId: "3458764667959874614",
    estadoColumnId: "0f0145f9-6cf1-46b9-84eb-dc1e07a20605",
    completadaOptionId: "completada",
    historicoDocId: "3458764668106891278",
  },
};
