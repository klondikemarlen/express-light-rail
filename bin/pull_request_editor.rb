require "tempfile"
require "open3"

##
# Supports fetching and editing PR descriptions from a full GitHub PR URL using SSH and GitHub CLI.
#
# Example usage:
#   - PullRequestEditor.edit_pull_request_description('https://github.com/icefoganalytics/travel-authorization/pull/218')
class PullRequestEditor
  EDITOR = ENV.fetch("EDITOR", "windsurf")

  # Edits the pull request description using GitHub CLI and VS Code
  def self.edit_pull_request_description(pull_request_url)
    repo, pull_request_number = extract_repo_and_pull_request_number(pull_request_url)

    pull_request_body = fetch_pull_request_body(repo, pull_request_number)

    app_root = File.expand_path(File.join(File.dirname(__FILE__), ".."))
    tmp_dir = File.join(app_root, "tmp")
    Dir.mkdir(tmp_dir) unless Dir.exist?(tmp_dir)

    Tempfile.create(["pull_request_description_#{pull_request_number}", ".md"], tmp_dir) do |file|
      file.write(pull_request_body)
      file.flush

      open_in_editor_command = "#{EDITOR} --wait #{file.path}"
      system(open_in_editor_command)
      unless $?.success?
        raise "Failed to open in editor: '#{open_in_editor_command}' (exit code: #{$?.exitstatus})"
      end

      updated_pull_request_body = File.read(file.path)

      if updated_pull_request_body.strip != pull_request_body.strip
        update_pull_request_body(repo, pull_request_number, file.path)
      else
        puts "No changes made to the PR description."
      end
    end
  end

  private

  # Extracts the repository name and PR number from a full GitHub PR URL
  def self.extract_repo_and_pull_request_number(pull_request_url)
    match_data = pull_request_url.match(%r{github.com/([^/]+)/([^/]+)/pull/(\d+)})
    repo = "#{match_data[1]}/#{match_data[2]}"
    pull_request_number = match_data[3]
    [repo, pull_request_number]
  end

  # Fetches the PR body using the GitHub CLI
  def self.fetch_pull_request_body(repo, pull_request_number)
    command = "gh pr view #{pull_request_number} --repo #{repo} --json body --jq .body"
    puts "running: #{command}"
    stdout, stderr, status = Open3.capture3(command)

    if status.success?
      stdout.strip
    else
      puts "Error fetching PR description: #{stderr}"
      exit(1)
    end
  end

  # Updates the PR body using the GitHub CLI
  def self.update_pull_request_body(repo, pull_request_number, new_body_file_path)
    command =
      "gh pr edit #{pull_request_number} --repo #{repo} --body-file \"#{new_body_file_path}\""
    puts "running: #{command}"
    stdout, stderr, status = Open3.capture3(command)

    if status.success?
      puts "stdout: #{stdout}"
      puts "PR description updated successfully."
    else
      puts "Error updating PR description: #{stderr}"
    end
  end
end
