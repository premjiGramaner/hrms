import React from "react";
import Layout from "../../components/Layout";
import LeaveNavBar from "./LeaveNavBar";

interface Props {
  children: React.ReactNode;
}

export default function LeaveLayout({ children }: Props) {
  return (
    <Layout title="Leave">
      <div className="-mx-6 -mt-6 flex flex-col" style={{ height: "calc(100% + 1.5rem)" }}>
        <div className="flex-shrink-0" style={{ overflow: "visible" }}>
          <LeaveNavBar />
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </Layout>
  );
}
