with open(r'c:\Users\nk748\OneDrive\Desktop\ROAD-SENTINEL\campus-safety-website\src\app\track\page.tsx', 'r', encoding='utf-8') as f:
    t = f.read()

target = '<p className="font-medium text-sm">{report.location?.address || (report.location?.lat ? `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}` : "IIT Mandi Campus")}</p>'

replacement = '''<div>
                        <p className="font-medium text-sm text-foreground">{report.location?.address || "IIT Mandi Campus"}</p>
                        {report.location?.lat && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted font-mono bg-gray-100 px-2 py-0.5 rounded">
                              GPS: {report.location.lat.toFixed(5)}, {report.location.lng.toFixed(5)}
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View on Map ↗
                            </a>
                          </div>
                        )}
                      </div>'''

if target in t:
    t = t.replace(target, replacement)
    with open(r'c:\Users\nk748\OneDrive\Desktop\ROAD-SENTINEL\campus-safety-website\src\app\track\page.tsx', 'w', encoding='utf-8') as f:
        f.write(t)
    print("track/page.tsx updated!")
else:
    print("target not found")
