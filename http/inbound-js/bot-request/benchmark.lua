-- Function to generate a random UUID
function generate_uuid()
    local random = math.random
    local template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    return string.gsub(template, '[xy]', function (c)
        local v = (c == 'x') and random(0, 0xf) or random(8, 0xb)
        return string.format('%x', v)
    end)
end

-- Initialize random seed
math.randomseed(os.time())

-- Set up the request
wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"

-- Generate new payload for each request
request = function()
    local payload = string.format([[{
        "app": "6d4943ce-b474-4790-9a60-90d51f6a678e",
        "payload": {
            "text": "hi"
        },
        "from": {
            "userID": "%s"
        },
        "messageId": {
            "Id": "%s",
            "channelMessageId": "%s"
        },
        "testSequenceId": 0
    }]], generate_uuid(), generate_uuid(), generate_uuid())
    
    return wrk.format(nil, nil, nil, payload)
end
