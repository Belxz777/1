import { AuthLayout } from "@/components/layouts/AuthLayout.tsx";
import { DashLayout } from "@/components/layouts/DashLayout";
import { Html } from "@elysiajs/html";
interface RegisterPageProps {
  error?: string;
}

export const RegisterPage = ({
  error,
}: RegisterPageProps) => {

    return (

        <DashLayout title="Панель управления"></DashLayout>


    );
};