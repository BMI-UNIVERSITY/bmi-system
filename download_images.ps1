$images = @{
  'home-hero' = @(
    @{url='https://images.pexels.com/photos/1205651/pexels-photo-1205651.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='home-hero-1-graduation.jpg'},
    @{url='https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='home-hero-2-students.jpg'},
    @{url='https://images.pexels.com/photos/1181534/pexels-photo-1181534.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='home-hero-3-campus.jpg'},
    @{url='https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='home-hero-4-library.jpg'},
    @{url='https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='home-hero-5-worship.jpg'}
  );
  'academics-hero' = @(
    @{url='https://images.pexels.com/photos/1516440/pexels-photo-1516440.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='academics-hero-1-studying.jpg'},
    @{url='https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='academics-hero-2-books.jpg'},
    @{url='https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='academics-hero-3-classroom.jpg'},
    @{url='https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='academics-hero-4-university.jpg'},
    @{url='https://images.pexels.com/photos/301926/pexels-photo-301926.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='academics-hero-5-lecture.jpg'}
  );
  'admissions-hero' = @(
    @{url='https://images.pexels.com/photos/1595391/pexels-photo-1595391.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='admissions-hero-1-students-group.jpg'},
    @{url='https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='admissions-hero-2-interview.jpg'},
    @{url='https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='admissions-hero-3-orientation.jpg'},
    @{url='https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='admissions-hero-4-meeting.jpg'},
    @{url='https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='admissions-hero-5-campus-tour.jpg'}
  );
  'about-hero' = @(
    @{url='https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='about-hero-1-team.jpg'},
    @{url='https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='about-hero-2-leadership.jpg'},
    @{url='https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='about-hero-3-faculty.jpg'},
    @{url='https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='about-hero-4-community.jpg'},
    @{url='https://images.pexels.com/photos/1181715/pexels-photo-1181715.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='about-hero-5-teaching.jpg'}
  );
  'contact-hero' = @(
    @{url='https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='contact-hero-1-office.jpg'},
    @{url='https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='contact-hero-2-help-desk.jpg'},
    @{url='https://images.pexels.com/photos/933964/pexels-photo-933964.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='contact-hero-3-phone.jpg'},
    @{url='https://images.pexels.com/photos/2574966/pexels-photo-2574966.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='contact-hero-4-church.jpg'},
    @{url='https://images.pexels.com/photos/1701202/pexels-photo-1701202.jpeg?auto=compress&cs=tinysrgb&w=1280'; name='contact-hero-5-christian-community.jpg'}
  )
}

$baseDir = 'D:\BMI\images'
$successCount = 0
$failCount = 0

foreach ($folder in $images.Keys) {
  foreach ($img in $images[$folder]) {
    $dest = Join-Path $baseDir "$folder\$($img.name)"
    try {
      Invoke-WebRequest -Uri $img.url -OutFile $dest -TimeoutSec 30 -UseBasicParsing
      Write-Host "OK: $($img.name)" -ForegroundColor Green
      $successCount++
    } catch {
      Write-Host "FAIL: $($img.name) - $($_.Exception.Message)" -ForegroundColor Red
      $failCount++
    }
  }
}

Write-Host "`nDone! Success: $successCount | Failed: $failCount"
