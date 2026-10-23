import type { ReactElement } from "react";

type ApiBoundaryProps = Readonly<{
  baseUrl: string;
}>;

export const ApiBoundary = ({ baseUrl }: ApiBoundaryProps): ReactElement => (
  <div className="sr-only" aria-hidden="true">
    <a href={`${baseUrl}/health`}>API health</a>
  </div>
);

