import type { ReactElement } from "react";
import { createApiConfiguration, readWebEnvironment } from "@/config";
import { GanttChart } from "@/features/gantt-chart";

const GanttPage = (): ReactElement => {
  const api = createApiConfiguration(readWebEnvironment());
  return <GanttChart apiBaseUrl={api.baseUrl} />;
};

export default GanttPage;
