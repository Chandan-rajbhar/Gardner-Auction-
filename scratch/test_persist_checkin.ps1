$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs'
    'Prefer' = 'return=representation'
}

$aucUrl = 'https://rzacpssumjahxndmqnxm.supabase.co/rest/v1/auctions?id=eq.auc-001'
$auc = (Invoke-RestMethod -Uri $aucUrl -Headers $headers -Method Get)[0]

# Build comprehensive day_stats hashtable with real bidders
$regs = @(
    @{
        id = 'reg-1000'
        bidCardNumber = '1000'
        bidderName = 'Randy A Stratford'
        companyName = 'Stratford Numismatics'
        email = 'randy@stratfordcoins.com'
        phone = '(406) 555-1000'
        hearAboutUs = 'Repeat Client'
        username = 'randy_stratford'
        hibidReputation = '5.0 ★ (42 reviews)'
        bidCount = 8
        permissionText = 'Approved - Standard'
        dateTime = '10/22/2026, 08:30 AM'
        site = 'In-House / Admin'
        notes = 'VIP Consignor & Floor Buyer'
        shippingRequested = $false
        bidderNotes = 'Saleroom verified'
        isCheckedIn = $true
        depositAmount = 0
        depositStatus = 'Pending'
        createdAt = '2026-10-22T08:30:00Z'
    },
    @{
        id = 'reg-2001'
        bidCardNumber = '2001'
        bidderName = 'Roger Perry'
        companyName = 'Bitterroot Gold & Silver'
        email = 'roger.perry@bitterrootgold.com'
        phone = '(406) 555-2001'
        hearAboutUs = 'AuctionZip'
        username = 'rperry_bullion'
        hibidReputation = '4.9 ★ (28 reviews)'
        bidCount = 5
        permissionText = 'Approved - Limit ($100,000)'
        dateTime = '10/22/2026, 09:00 AM'
        site = 'HiBid.com'
        notes = 'High volume bullion dealer'
        shippingRequested = $true
        bidderNotes = 'Insured courier'
        isCheckedIn = $true
        depositAmount = 2500
        depositStatus = 'Collected'
        createdAt = '2026-10-22T09:00:00Z'
    },
    @{
        id = 'reg-5001'
        bidCardNumber = '5001'
        bidderName = 'Helena Vance'
        companyName = 'Vance Fine Antiques LLC'
        email = 'helena@vanceantiques.com'
        phone = '(406) 555-0144'
        hearAboutUs = 'Website'
        username = 'helena_vance'
        hibidReputation = '5.0 ★ (48 reviews)'
        bidCount = 12
        permissionText = 'Approved - Limit ($50,000)'
        dateTime = '10/22/2026, 09:15 AM'
        site = 'In-House / Admin'
        notes = 'Verified photo ID on file'
        shippingRequested = $false
        bidderNotes = 'Saleroom verified'
        isCheckedIn = $true
        depositAmount = 1500
        depositStatus = 'Collected'
        createdAt = '2026-10-22T09:15:00Z'
    },
    @{
        id = 'reg-5002'
        bidCardNumber = '5002'
        bidderName = 'Marcus Chen'
        companyName = 'Apex Asset Holdings'
        email = 'marcus@apexassets.com'
        phone = '(406) 555-0199'
        hearAboutUs = 'Referral / Word of Mouth'
        username = 'mchen_gold'
        hibidReputation = '4.9 ★ (19 reviews)'
        bidCount = 4
        permissionText = 'Approved - Limit ($35,000)'
        dateTime = '10/22/2026, 10:45 AM'
        site = 'HiBid.com'
        notes = 'Simulcast pre-registration'
        shippingRequested = $true
        bidderNotes = 'FedEx Priority overnight'
        isCheckedIn = $false
        depositAmount = 0
        depositStatus = 'Pending'
        createdAt = '2026-10-22T10:45:00Z'
    },
    @{
        id = 'reg-5003'
        bidCardNumber = '5003'
        bidderName = 'Eleanor Rigby'
        companyName = 'Yellowstone Rare Coins'
        email = 'eleanor@yellowstonecoins.com'
        phone = '(406) 555-0211'
        hearAboutUs = 'HiBid Directory'
        username = 'erigby_coins'
        hibidReputation = '5.0 ★ (64 reviews)'
        bidCount = 19
        permissionText = 'Approved - Unlimited'
        dateTime = '10/22/2026, 11:00 AM'
        site = 'HiBid.com'
        notes = 'Premier bidder - verified bank letter of credit'
        shippingRequested = $false
        bidderNotes = 'In-person collection'
        isCheckedIn = $false
        depositAmount = 5000
        depositStatus = 'Collected'
        createdAt = '2026-10-22T11:00:00Z'
    }
)

$deposits = @(
    @{
        id = 'dep-1001'
        auctionId = 'auc-001'
        registrationId = 'reg-5001'
        bidCardNumber = '5001'
        bidderName = 'Helena Vance'
        amount = 1500
        paymentMethod = 'Credit Card'
        status = 'Collected'
        date = '2026-10-22'
        referenceNumber = 'AUTH-991204'
        notes = 'Cashier pre-auction bidder deposit'
        receivedBy = 'Admin Cashier'
        createdAt = '2026-10-22T09:20:00Z'
    },
    @{
        id = 'dep-1002'
        auctionId = 'auc-001'
        registrationId = 'reg-2001'
        bidCardNumber = '2001'
        bidderName = 'Roger Perry'
        amount = 2500
        paymentMethod = 'Wire Transfer'
        status = 'Collected'
        date = '2026-10-22'
        referenceNumber = 'WIRE-448291'
        notes = 'Pre-cleared morning bank wire'
        receivedBy = 'Finance Dept'
        createdAt = '2026-10-22T09:05:00Z'
    },
    @{
        id = 'dep-1003'
        auctionId = 'auc-001'
        registrationId = 'reg-5003'
        bidCardNumber = '5003'
        bidderName = 'Eleanor Rigby'
        amount = 5000
        paymentMethod = 'Check'
        status = 'Collected'
        date = '2026-10-22'
        referenceNumber = 'CHK-8902'
        notes = 'Cashier check verified with First Interstate Bank'
        receivedBy = 'Todd Gardner'
        createdAt = '2026-10-22T11:05:00Z'
    }
)

$checkedInCount = ($regs | Where-Object { $_.isCheckedIn -eq $true }).Count

$existingDayStats = $auc.day_stats
$dayStatsHash = @{
    lotCount = 7
    checkInCount = $checkedInCount
    uniqueSellers = 1
    presaleMin = 50000
    presaleMax = 110000
    avgEstimate = 11428.57
    avgSalesPrice = 45000
    auctionType = 'HiBid'
    hibidUrl = 'https://hibid.com'
    registrations = $regs
    deposits = $deposits
    alternateBids = if ($existingDayStats.alternateBids) { $existingDayStats.alternateBids } else { @() }
    siteStats = if ($existingDayStats.siteStats) { $existingDayStats.siteStats } else { @() }
    lotStats = if ($existingDayStats.lotStats) { $existingDayStats.lotStats } else { @() }
}

$patchObj = @{
    day_stats = $dayStatsHash
    updated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
}

$jsonStr = $patchObj | ConvertTo-Json -Depth 10
$utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)

$updateUrl = 'https://rzacpssumjahxndmqnxm.supabase.co/rest/v1/auctions?id=eq.auc-001'
$updated = Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Patch -Body $utf8Bytes -ContentType 'application/json'

Write-Output "Successfully updated auc-001 in Supabase!"
Write-Output "Auction Name: $($updated[0].name)"
Write-Output "Auction Status: $($updated[0].status)"
Write-Output "Registrations in Supabase: $($updated[0].day_stats.registrations.Count)"
Write-Output "Check In Count in Supabase: $($updated[0].day_stats.checkInCount)"
Write-Output "Deposits in Supabase: $($updated[0].day_stats.deposits.Count)"
Write-Output "Auction Type in Supabase: $($updated[0].day_stats.auctionType)"
