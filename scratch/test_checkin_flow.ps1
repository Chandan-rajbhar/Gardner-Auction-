$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs'
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

Write-Output "=== 1. Checking auc-001 in Supabase ==="
$aucUrl = 'https://rzacpssumjahxndmqnxm.supabase.co/rest/v1/auctions?id=eq.auc-001'
$auc = Invoke-RestMethod -Uri $aucUrl -Headers $headers -Method Get
Write-Output "Auction Name: $($auc.name)"
Write-Output "Auction Status: $($auc.status)"
Write-Output "Auction Type: $($auc.day_stats.auctionType)"
Write-Output "Check In Count: $($auc.day_stats.checkInCount)"
Write-Output "Total Registered Bidders: $($auc.day_stats.registrations.Count)"

Write-Output "`n=== First 3 Bidders ==="
$count = [Math]::Min(3, $auc.day_stats.registrations.Count)
for ($i = 0; $i -lt $count; $i++) {
    $r = $auc.day_stats.registrations[$i]
    Write-Output "Paddle #$($r.bidCardNumber): $($r.bidderName) | Company: $($r.companyName) | Email: $($r.email) | CheckedIn: $($r.isCheckedIn)"
}

Write-Output "`n=== 2. Testing Bidder Registrations Table ==="
try {
    $regTableUrl = 'https://rzacpssumjahxndmqnxm.supabase.co/rest/v1/bidder_registrations?limit=5'
    $regTable = Invoke-RestMethod -Uri $regTableUrl -Headers $headers -Method Get
    Write-Output "bidder_registrations table accessible! Row count: $($regTable.Count)"
} catch {
    Write-Output "bidder_registrations table REST status: $($_.Exception.Message)"
}

Write-Output "`n=== 3. Testing Bidder Deposits Table ==="
try {
    $depTableUrl = 'https://rzacpssumjahxndmqnxm.supabase.co/rest/v1/bidder_deposits?limit=5'
    $depTable = Invoke-RestMethod -Uri $depTableUrl -Headers $headers -Method Get
    Write-Output "bidder_deposits table accessible! Row count: $($depTable.Count)"
} catch {
    Write-Output "bidder_deposits table REST status: $($_.Exception.Message)"
}
