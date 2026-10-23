import type { ReactElement } from "react";
import { createApiConfiguration, readWebEnvironment } from "@/config";
import { Timeline } from "@/features/timeline";

const TimelinePage = (): ReactElement => {
  const api = createApiConfiguration(readWebEnvironment());
  return <Timeline apiBaseUrl={api.baseUrl} />;
};

export default TimelinePage;
