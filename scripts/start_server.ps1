Start-Process -FilePath "node.exe" -ArgumentList "node_modules/vite/bin/vite.js" -WorkingDirectory "C:\Users\UxdLab\Downloads\Gardner Auction" -RedirectStandardOutput "vite_stdout.log" -RedirectStandardError "vite_stderr.log"
Start-Sleep -Seconds 3
Get-Content -Path "vite_stdout.log" -ErrorAction SilentlyContinue
Get-Content -Path "vite_stderr.log" -ErrorAction SilentlyContinue
