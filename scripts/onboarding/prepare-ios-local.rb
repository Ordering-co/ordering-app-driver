require 'fileutils'
require 'xcodeproj'
root, target = ARGV
abort 'Invalid native target' unless target && target.match?(/\A[a-zA-Z][a-zA-Z0-9]*\z/)
ios = File.join(root, 'ios')
source = File.join(ios, "#{target}.xcodeproj")
destination = File.join(ios, ".ordering-local-#{target}.xcodeproj")
workspace = File.join(ios, ".ordering-local-#{target}.xcworkspace")
marker = File.join(ios, ".ordering-local-#{target}.owner")
abort 'Refusing symlinked local project paths' if [source, destination, workspace, marker].any? { |entry| File.symlink?(entry) }
owner = "Ordering local simulator adapter\n#{File.realpath(root)}\n#{target}\n"
if File.exist?(destination) || File.exist?(workspace) || File.exist?(marker)
  abort 'Refusing to replace an unowned local project' unless File.file?(marker) && File.read(marker) == owner
end
File.write(marker, owner)
FileUtils.rm_rf(destination) if File.directory?(destination) && !File.symlink?(destination)
FileUtils.cp_r(source, destination)
project = Xcodeproj::Project.open(destination)
app_target = project.targets.find { |candidate| candidate.name == target }
abort 'Native target missing' unless app_target
app_target.resources_build_phase.files.to_a.each do |entry|
  entry.remove_from_project if entry.file_ref && File.basename(entry.file_ref.path || '') == 'GoogleService-Info.plist'
end
# Crashlytics' symbol-upload phase requires a Firebase app ID; it is never part of a local preview.
app_target.shell_script_build_phases.to_a.each do |phase|
  phase.remove_from_project if (phase.name || '').include?('[RNFB] Crashlytics')
end
project.save
Dir.glob(File.join(destination, 'xcshareddata', 'xcschemes', '*.xcscheme')).each do |scheme|
  content = File.read(scheme).gsub("container:#{target}.xcodeproj", "container:.ordering-local-#{target}.xcodeproj")
  File.write(scheme, content)
end
FileUtils.mkdir_p(workspace)
content = File.read(File.join(ios, "#{target}.xcworkspace", 'contents.xcworkspacedata')).gsub("group:#{target}.xcodeproj", "group:.ordering-local-#{target}.xcodeproj")
File.write(File.join(workspace, 'contents.xcworkspacedata'), content)
puts workspace
