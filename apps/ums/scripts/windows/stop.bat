@echo off
title BMI UMS - Stop Services
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\dev\stop-all-windows.ps1"
pause
