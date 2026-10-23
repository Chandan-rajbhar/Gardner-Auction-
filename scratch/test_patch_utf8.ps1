$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs'
    'Prefer' = 'return=representation'
}

$aucUrl = 'https://rzacpssumjahxndmqnxm.supabase.co/rest/v1/auctions?id=eq.auc-001'
$auc = (Invoke-RestMethod -Uri $aucUrl -Headers $headers -Method Get)[0]
$dayStats = $auc.day_stats

$testPatch = @{
    status = 'Open'
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri $aucUrl -Headers $headers -Method Patch -Body ([System.Text.Encoding]::UTF8.GetBytes($testPatch)) -ContentType 'application/json'
Write-Output "Simple status patch result: $($res.status)"
