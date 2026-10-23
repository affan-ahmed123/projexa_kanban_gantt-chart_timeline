import type { ReactElement } from "react";
import { createApiConfiguration, readWebEnvironment } from "@/config";
import { TaskBoard } from "@/features/task-board";

const BoardPage = (): ReactElement => {
  const api = createApiConfiguration(readWebEnvironment());
  return <TaskBoard apiBaseUrl={api.baseUrl} />;
};

export default BoardPage;
