import React from "react";
import Layout from "../../components/Layout";
import LeaveNavBar from "./LeaveNavBar";

interface Props {
  children: React.ReactNode;
}

export default function LeaveLayout({ children }: Props) {
  return (
    <Layout title="Leave" topNav={<LeaveNavBar />}>
      {children}
    </Layout>
  );
}
