using Godot;
using System;
using System.Collections.Generic;

public class NameGenerator
{
    private static string[] firstNames = new string[] { "Aaron", "Adam", "Alan", "Albert", "Antonio", "Arthur", "Benjamin", "Bill", "Billy", "Bob", "Bobby", "Brandon", "Brian", "Bruce", "Caleb", "Carl", "Carlos", "Chad", "Chris", "Clarence", "Clint", "Craig", "Dave", "Earl", "Ernest", "Eugene", "Fred", "Gary", "Gerald", "Greg", "Harry", "Henry", "Howard", "Jack", "Jeff", "Jeremy", "Jesse", "Jim", "Jimmy", "Joe", "John", "Johnny", "Jonathan", "Josh", "Juan", "Justin", "Keith", "Kevin", "Larry", "Lawrence", "Louis", "Mark", "Martin", "Mike", "Nicholas", "Paul", "Phillip", "Ralph", "Randy", "Roger", "Ron", "Roy", "Russell", "Ryan", "Samuel", "Scott", "Sean", "Shawn", "Steve", "Terry", "Tim", "Todd", "Tom", "Victor", "Wayne", "Willie", "Zachary" };
    private static string[] lastNames = new string[] { "Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez", "James", "Watson", "Brooks", "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes", "Ross", "Henderson", "Coleman", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores", "Washington", "Butler", "Simmons", "Foster", "Gonzales", "Bryant", "Alexander", "Russell", "Griffin", "Diaz", "Hayes", "Myers", "Ford", "Hamilton", "Graham", "Sullivan", "Wallace", "Woods", "Cole", "West", "Jordan", "Owens", "Reynolds", "Fisher", "Ellis", "Harrison", "Gibson", "Mcdonald", "Cruz", "Marshall", "Ortiz", "Gomez", "Murray", "Freeman", "Wells", "Webb", "Simpson", "Stevens", "Tucker", "Porter", "Hunter", "Hicks", "Crawford", "Henry", "Boyd", "Mason", "Morales", "Kennedy", "Warren", "Dixon", "Ramos", "Reyes", "Burns", "Gordon", "Shaw", "Holmes", "Rice", "Robertson", "Hunt", "Black", "Daniels", "Palmer", "Mills", "Nichols", "Grant", "Knight", "Ferguson", "Rose", "Stone", "Hawkins", "Dunn", "Perkins", "Hudson", "Spencer", "Gardner", "Stephens", "Payne", "Pierce", "Berry", "Matthews", "Arnold", "Wagner", "Willis", "Ray", "Watkins", "Olson", "Carroll", "Duncan", "Snyder", "Hart", "Cunningham", "Bradley", "Lane", "Andrews", "Ruiz", "Harper", "Fox", "Riley", "Armstrong", "Carpenter", "Weaver", "Greene", "Lawrence", "Elliott", "Chavez", "Sims", "Austin", "Peters", "Kelley", "Franklin", "Lawson", "Fields", "Gutierrez", "Ryan", "Schmidt", "Carr", "Vasquez", "Castillo", "Wheeler", "Chapman", "Oliver", "Montgomery", "Richards", "Williamson", "Johnston", "Banks", "Meyer", "Bishop", "McCoy", "Howell", "Alvarez", "Morrison", "Hansen", "Fernandez", "Garza"};

    public static string GenerateName()
    {
        Random random = new Random();

        int firstNameIndex = random.Next(0, firstNames.Length);
        int lastNameIndex = random.Next(0, lastNames.Length);

        return $"{firstNames[firstNameIndex]} {lastNames[lastNameIndex]}";
    }

}