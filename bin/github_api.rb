require 'net/http'
require 'json'
require 'uri'

##
# Supports building a branch name from a Github issue URL
# If issue is from the same repo as the project, the branch name will be in the format:
#   issue-<issue_number>/<issue_title>
# If issue is from a replated repo (presumably the upstream one), the branch name will be in the format:
#   <issue_owner>-issue-<issue_number>/<issue_title>
class GithubApi
  GITHUB_TOKEN = ENV['GITHUB_TOKEN']
  GITHUB_REPO = 'klondikemarlen/express-light-rail' # Format: 'owner/repo'
  GITHUB_API_BASE = 'https://api.github.com'

  def self.build_branch_name(github_issue_url)
    if GITHUB_TOKEN.nil?
      puts 'Please set GITHUB_TOKEN environment variable'
      return
    end

    issue_repo = extract_issue_repo(github_issue_url)
    issue_number = extract_issue_number(github_issue_url)
    issue_title = fetch_issue_title(issue_repo, issue_number)
    format_branch_name(issue_repo, issue_number, issue_title)
  end

  private

  def self.extract_issue_repo(url)
    match_data = url.match(%r{github.com/([^/]+)/([^/]+)/issues/\d+})
    "#{match_data[1]}/#{match_data[2]}"
  end

  def self.extract_issue_number(url)
    url.match(%r{/issues/(\d+)})[1]
  end

  def self.fetch_issue_title(repo, issue_number)
    puts "Fetching issue title for #{repo}##{issue_number}..."
    uri = URI("#{GITHUB_API_BASE}/repos/#{repo}/issues/#{issue_number}")
    request = Net::HTTP::Get.new(uri)
    request['Authorization'] = "token #{GITHUB_TOKEN}"

    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
      http.request(request)
    end

    if response.code.to_i == 404 || response.code.to_i == 401
      raise ScriptError, "Authorization failed. Please check your GitHub token."
    end

    data = JSON.parse(response.body)
    data['title']
  end

  def self.format_branch_name(issue_repo, issue_number, issue_title)
    formatted_title = issue_title.downcase
                                 .strip
                                 .gsub(/\s+/, '-')
                                 .gsub(/[^a-z0-9\-]/, '')
                                 .gsub(/-+/, '-')

    if issue_repo == GITHUB_REPO
      return "issue-#{issue_number}/#{formatted_title}"
    end

    issue_owner = issue_repo.split('/')[0]
    "#{issue_owner}-issue-#{issue_number}/#{formatted_title}"
  end
end
