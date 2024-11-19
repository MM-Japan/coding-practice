# Removes duplicates from a list while preserving the order

# Solution 1 and Solution 5 are the most efficient (O(n))

# Method 1
def remove_duplicates(arr)
  # hash for keeping track of items seen
  seen = {}
  # array to push the items into
  result = []

  # iterate over the array and compare the items to the seen hash
  # unless its the same, push it into the result
  arr.each do |item|
    unless seen[item]
      result << item
      seen[item] = true
    end
  end
  # return the result
  result
end


# Method 2

def remove_duplicates(arr)
  arr.uniq { |item| item }
end

# Method 3

def remove_duplicates(arr)
  arr.each_with_object([]) do |item, result|
    result << item unless result.include?(item)
  end
end

# Method 4

def remove_duplicates(arr)
  arr.inject([]) do |result, item|
    result << item unless result.include?(item)
    result
  end
end

# Method 5

require 'set'

def remove_duplicates(arr)
  seen = Set.new
  arr.select { |item| seen.add?(item) }
end
