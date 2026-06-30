!ifndef BUILD_UNINSTALLER
!define MUI_PAGE_CUSTOMFUNCTION_SHOW GyenBoxInstallPageShow

Function GyenBoxInstallPageShow
  Call GyenBoxInstallPageBrandTick
  ; electron-builder writes the default "Installing..." text after the page is shown.
  ; Keep a short-lived timer so the branded copy wins without replacing the stable flow.
  nsDialogs::CreateTimer GyenBoxInstallPageBrandTick 120
FunctionEnd

Function GyenBoxInstallPageBrandTick
  FindWindow $0 "#32770" "" $HWNDPARENT
  FindWindow $0 "#32770" "" $HWNDPARENT $0
  IntCmp $0 0 done done 0

  GetDlgItem $1 $0 1000
  IntCmp $1 0 progress progress 0
  SendMessage $1 0x000C 0 "STR:Preparing your GyenBox space...$\r$\nYour protected local folder, Quick Access, and sync badges are being connected."

  progress:
  FindWindow $2 "msctls_progress32" "" $0
  IntCmp $2 0 done done 0
  System::Call 'uxtheme::SetWindowTheme(p r2, w " ", w " ")'
  ; PBM_SETBARCOLOR, COLORREF for #6A8DFF.
  SendMessage $2 0x0409 0 0x00FF8D6A
  done:
FunctionEnd

!macro customInstall
  nsDialogs::KillTimer GyenBoxInstallPageBrandTick
  Call GyenBoxInstallPageBrandTick

  ; Clear the first-run Setup marker on every install so the freshly launched
  ; build always shows the GyenBox Setup window (the version-keyed marker would
  ; otherwise skip it on a same-version reinstall).
  Delete "$APPDATA\@gyenbox\desktop\setup-state.json"
!macroend
!endif

!macro customHeader
  ; Avoid Windows bitmap-scaling the NSIS installer on high-DPI displays.
  ManifestDPIAware true
!macroend

!macro customInit
  ; Keep the one-click installer crisp even when the manifest is ignored.
  System::Call 'user32::SetProcessDPIAware()i.r0'

  ; A GyenBox left running from a previous build holds the single-instance lock
  ; and locks GyenBox.exe. If we don't stop it first: (a) the new files may fail
  ; to overwrite the locked exe, and (b) the freshly launched build can't take
  ; the lock (it quits immediately), so the OLD build handles the relaunch and
  ; jumps straight to the folder -- first-run Setup never appears. Force-close
  ; any running instance so the new build starts clean and shows Setup.
  nsExec::Exec 'taskkill /F /T /IM GyenBox.exe'
  Sleep 800
!macroend
