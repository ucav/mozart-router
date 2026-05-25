# Mozart Demo Recording Script (for vhs by charmbracelet)
# Install: brew install vhs   or   go install github.com/charmbracelet/vhs@latest
# Record:  vhs demo.tape
# Output:  demo.gif (place in repo root, reference in README)

# Settings
Set FontSize 16
Set Width 100
Set Height 28
Set Theme "Dark"
Set Padding 2
Set Framerate 20
Set PlaybackSpeed 0.8

# Hide the cursor for cleaner output
Hide

# Type slowly for readability
Type "npm install -g mozart-router"
Enter
Sleep 2s

Type "mozart-router doctor"
Enter
Sleep 3s

Type "mozart-router simulate \"debug my Next.js build error\""
Enter
Sleep 2s

Type "mozart-router route \"write Playwright tests for the login page\""
Enter
Sleep 1s

Type "mozart-router why"
Enter
Sleep 1s

Type "mozart-router report"
Enter
Sleep 1s

Type "mozart-router profiles"
Enter
Sleep 1s

Type "mozart-router pricing sync"
Enter
Sleep 2s

# Done
Show
Sleep 3s
