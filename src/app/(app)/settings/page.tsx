import { getPreference } from "@/lib/actions/preferences";
import { listCategories } from "@/lib/actions/categories";
import { listAlertPreferences } from "@/lib/actions/alerts";
import { hasSampleData } from "@/lib/actions/sampleData";
import { PageHeader } from "@/components/finance/page-header";
import { PreferencesForm } from "@/components/finance/settings/preferences-form";
import { CategoriesManager } from "@/components/finance/settings/categories-manager";
import { AlertPreferencesManager } from "@/components/finance/settings/alert-preferences-manager";
import { SampleDataBanner } from "@/components/finance/dashboard/sample-data-banner";

export default async function SettingsPage() {
  const [preference, categories, alertPreferences, sampleDataExists] = await Promise.all([
    getPreference(),
    listCategories(),
    listAlertPreferences(),
    hasSampleData(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Preferences, categories, and alert thresholds." />
      <SampleDataBanner hasSampleData={sampleDataExists} />
      <PreferencesForm preference={preference} />
      <CategoriesManager categories={categories} />
      <AlertPreferencesManager items={alertPreferences} />
    </div>
  );
}
