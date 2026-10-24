import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ReportForm from "@/components/report/ReportForm";
import { AlertTriangle } from "lucide-react";

export default function ReportPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Report a Hazard</h1>
            <p className="text-muted">
              Help make IIT Mandi campus safer by reporting road hazards. Upload
              a photo, mark the location, and provide details about the issue.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-8">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">For emergencies, call campus security directly</p>
              <p>This platform is for non-emergency hazard reporting only.</p>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <ReportForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
