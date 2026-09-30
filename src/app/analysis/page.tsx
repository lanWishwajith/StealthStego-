import { AnalysisForm } from "./analysis-form";

export const metadata = {
  title: "Steganalysis Lab — StealthStego",
};

export default function AnalysisPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Steganalysis Lab
      </h1>
      <p className="mt-2 text-sm text-muted">
        Compare an original image against naive and content-adaptive stego
        outputs using statistical metrics.
      </p>
      <div className="mt-8">
        <AnalysisForm />
      </div>
    </div>
  );
}
