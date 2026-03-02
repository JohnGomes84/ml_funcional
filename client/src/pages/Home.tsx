import DashboardLayout from "./DashboardLayout";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Módulo inicial simplificado para manter a aplicação estável.
        </p>
      </div>
    </DashboardLayout>
  );
}
