import { User, Bell, Shield, Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">Settings</h2>
        <p className="text-sm text-muted">Manage your account and dashboard preferences.</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Profile Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Full Name</label>
              <input type="text" defaultValue="Admin User" className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Email Address</label>
              <input type="email" defaultValue="admin@iitmandi.ac.in" className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Role</label>
              <input type="text" defaultValue="System Administrator" disabled className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-muted cursor-not-allowed outline-none" />
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
          </div>
          
          <div className="space-y-4 max-w-2xl">
            {[
              { title: "New Hazard Reports", desc: "Receive alerts when a new hazard is reported." },
              { title: "Critical Severity Alerts", desc: "Immediate notifications for high-priority issues." },
              { title: "Weekly Digest", desc: "Summary report of resolved hazards every Monday." }
            ].map((pref, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-sm text-foreground">{pref.title}</p>
                  <p className="text-xs text-muted mt-0.5">{pref.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 bg-card-hover/30 flex justify-end">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
